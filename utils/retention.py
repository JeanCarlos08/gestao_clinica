"""
Data Retention & Automatic Cleanup para LGPD

Implementa políticas de retenção de dados (laudos, logs, auditoria).
Limpa dados antigos automaticamente.
"""

import os
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

from utils.logger import get_logger

logger = get_logger(__name__)


class RetentionPolicy:
    """Define e aplica políticas de retenção de dados."""
    
    # Políticas padrão (em dias)
    DEFAULTS = {
        "laudos": 2555,           # ~7 anos (exigido por lei)
        "audit_logs": 1095,       # ~3 anos (conformidade)
        "temp_files": 30,         # 30 dias
        "error_logs": 90,         # 90 dias
        "user_data_after_deletion": 0,  # Deletar imediatamente após solicitação
    }
    
    def __init__(self, policies: Dict[str, int] = None):
        """
        Initialize com políticas customizadas.
        
        Args:
            policies: Dict {tipo_dados: dias_retenção}
        """
        self.policies = {**self.DEFAULTS}
        if policies:
            self.policies.update(policies)
    
    def get_retention_days(self, data_type: str) -> int:
        """Retorna dias de retenção para tipo de dado."""
        return self.policies.get(data_type, 365)
    
    def is_expired(self, creation_date: datetime, data_type: str) -> bool:
        """Verifica se dado expirou."""
        retention_days = self.get_retention_days(data_type)
        expiration_date = creation_date + timedelta(days=retention_days)
        return datetime.utcnow() > expiration_date
    
    def get_expiration_date(self, creation_date: datetime, data_type: str) -> datetime:
        """Retorna data de expiração."""
        retention_days = self.get_retention_days(data_type)
        return creation_date + timedelta(days=retention_days)


class DataCleaner:
    """Limpa dados expirados automaticamente."""
    
    def __init__(self, policy: RetentionPolicy = None):
        self.policy = policy or RetentionPolicy()
        self.audit_dir = Path("logs")
        self.audit_dir.mkdir(exist_ok=True)
        self.cleanup_log = self.audit_dir / "cleanup.log"
    
    def cleanup_audit_logs(self, days: int = None) -> int:
        """Limpa logs de auditoria antigos."""
        days = days or self.policy.get_retention_days("audit_logs")
        return self._cleanup_files(
            Path("logs") / "audit.log",
            days,
            data_type="audit_logs"
        )
    
    def cleanup_temp_files(self, days: int = None) -> int:
        """Limpa arquivos temporários antigos."""
        days = days or self.policy.get_retention_days("temp_files")
        
        temp_dirs = [Path("laudos"), Path("/tmp")]
        total_removed = 0
        
        for temp_dir in temp_dirs:
            if temp_dir.exists():
                total_removed += self._cleanup_files(
                    temp_dir,
                    days,
                    data_type="temp_files"
                )
        
        return total_removed
    
    def cleanup_error_logs(self, days: int = None) -> int:
        """Limpa logs de erro antigos."""
        days = days or self.policy.get_retention_days("error_logs")
        log_file = Path("logs") / "error.log"
        return self._cleanup_files(log_file, days, data_type="error_logs")
    
    def _cleanup_files(self, path: Path, days: int, data_type: str = "unknown") -> int:
        """Remove arquivos modificados há mais de X dias."""
        if not path.exists():
            return 0
        
        cutoff_time = (datetime.utcnow() - timedelta(days=days)).timestamp()
        removed_count = 0
        
        if path.is_file():
            # Arquivo individual
            if path.stat().st_mtime < cutoff_time:
                try:
                    path.unlink()
                    removed_count = 1
                    logger.info(f"✓ Removido arquivo antigo: {path}")
                except Exception as e:
                    logger.error(f"Erro ao remover {path}: {e}")
        else:
            # Diretório - iterar arquivos
            for file_path in path.rglob("*"):
                if file_path.is_file() and file_path.stat().st_mtime < cutoff_time:
                    try:
                        file_path.unlink()
                        removed_count += 1
                    except Exception as e:
                        logger.error(f"Erro ao remover {file_path}: {e}")
        
        # Log de limpeza
        if removed_count > 0:
            self._log_cleanup(data_type, removed_count, days)
        
        return removed_count
    
    def _log_cleanup(self, data_type: str, removed_count: int, days: int):
        """Registra evento de limpeza."""
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data_type": data_type,
            "removed_count": removed_count,
            "retention_days": days,
            "event": "cleanup"
        }
        
        with open(self.cleanup_log, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        
        logger.info(f"✓ Limpeza [{data_type}]: removidos {removed_count} itens com >={days} dias")
    
    def cleanup_patient_data_after_deletion(self, patient_cpf: str) -> bool:
        """
        Remove todos os dados de um paciente após solicitação de exclusão (Right to be Forgotten).
        
        Args:
            patient_cpf: CPF do paciente
        
        Returns:
            True se sucesso
        """
        try:
            # Remover arquivos associados
            laudos_dir = Path("laudos")
            if laudos_dir.exists():
                for file in laudos_dir.glob(f"*{patient_cpf}*"):
                    file.unlink()
                    logger.info(f"✓ Deletado laudo: {file}")
            
            # Registrar exclusão
            with open(self.cleanup_log, "a", encoding="utf-8") as f:
                entry = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "cpf_hash": patient_cpf[-6:],
                    "event": "patient_data_deleted"
                }
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            
            logger.info(f"✓ Dados do paciente {patient_cpf} deletados (Right to be Forgotten)")
            return True
        
        except Exception as e:
            logger.error(f"Erro ao deletar dados de paciente: {e}")
            return False
    
    def get_cleanup_report(self) -> Dict:
        """Retorna relatório de limpezas realizadas."""
        if not self.cleanup_log.exists():
            return {"total_cleanups": 0, "cleanup_log": str(self.cleanup_log)}
        
        cleanups = []
        with open(self.cleanup_log, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    cleanups.append(json.loads(line))
                except:
                    pass
        
        return {
            "total_cleanups": len(cleanups),
            "cleanup_log": str(self.cleanup_log),
            "recent_cleanups": cleanups[-10:] if cleanups else []
        }


# Instâncias globais
_retention_policy = None
_data_cleaner = None


def get_retention_policy() -> RetentionPolicy:
    """Retorna instância singleton de política."""
    global _retention_policy
    if _retention_policy is None:
        _retention_policy = RetentionPolicy()
    return _retention_policy


def get_data_cleaner() -> DataCleaner:
    """Retorna instância singleton de cleaner."""
    global _data_cleaner
    if _data_cleaner is None:
        _data_cleaner = DataCleaner()
    return _data_cleaner


def cleanup_login_attempts(dias: int = 90) -> int:
    """
    Remove tentativas de login mais antigas que X dias.
    Chamado pelo scheduler para conformidade com retenção LGPD.
    """
    try:
        from database.lgpd_repositories import login_attempt_repo
        count = login_attempt_repo.limpar_antigos(dias=dias)
        logger.info(f"✓ Limpeza login_attempts: {count} registros removidos (>{dias} dias)")
        return count
    except Exception as e:
        logger.error(f"Erro ao limpar login_attempts: {e}")
        return 0


def run_scheduled_cleanup():
    """
    Executa limpeza agendada completa (usar em cron/scheduler).

    Limpa:
    - audit_logs     → 3 anos
    - temp_files     → 30 dias
    - error_logs     → 90 dias
    - login_attempts → 90 dias (LGPD: dados mínimos necessários)
    """
    cleaner = get_data_cleaner()

    logger.info("⏱️ Iniciando limpeza agendada de dados (LGPD)...")

    removed_audit = cleaner.cleanup_audit_logs()
    removed_temp = cleaner.cleanup_temp_files()
    removed_errors = cleaner.cleanup_error_logs()
    removed_logins = cleanup_login_attempts(dias=90)

    total = removed_audit + removed_temp + removed_errors + removed_logins
    logger.info(f"✓ Limpeza concluída: {total} itens removidos")

    return {
        "audit_logs": removed_audit,
        "temp_files": removed_temp,
        "error_logs": removed_errors,
        "login_attempts": removed_logins,
        "total": total,
    }
