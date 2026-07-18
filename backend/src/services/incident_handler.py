"""
Incident Response Handler para LGPD

Detecta e registra incidentes de segurança.
Notifica equipe e prepara documentação para ANPD.
"""

import json
import smtplib
from datetime import datetime, UTC
from pathlib import Path
from typing import Dict, Any, List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from utils.logger import get_logger

logger = get_logger(__name__)


class IncidentSeverity:
    """Níveis de severidade de incidente."""
    CRITICAL = "CRÍTICO"
    HIGH = "ALTO"
    MEDIUM = "MÉDIO"
    LOW = "BAIXO"
    INFO = "INFORMATIVO"


class IncidentType:
    """Tipos de incidente."""
    UNAUTHORIZED_ACCESS = "acesso_nao_autorizado"
    DATA_BREACH = "vazamento_dados"
    FAILED_AUTH = "falha_autenticacao"
    ANOMALOUS_ACTIVITY = "atividade_anomala"
    SYSTEM_FAILURE = "falha_sistema"
    POLICY_VIOLATION = "violacao_politica"
    CONFIGURATION_ERROR = "erro_configuracao"


class Incident:
    """Representa um incidente de segurança."""
    
    def __init__(
        self,
        incident_type: str,
        severity: str,
        title: str,
        description: str,
        affected_data: Optional[List[str]] = None,
        affected_users: Optional[int] = None,
        source: str = "system"
    ):
        self.id = self._generate_id()
        self.timestamp = datetime.now(UTC)
        self.incident_type = incident_type
        self.severity = severity
        self.title = title
        self.description = description
        self.affected_data = affected_data or []
        self.affected_users = affected_users or 0
        self.source = source
        self.status = "ABERTO"
        self.notes = []
    
    def _generate_id(self) -> str:
        """Gera ID único para o incidente."""
        ts = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
        return f"INC-{ts}"
    
    def add_note(self, note: str):
        """Adiciona anotação ao incidente."""
        self.notes.append({
            "timestamp": datetime.now(UTC).isoformat(),
            "note": note
        })
    
    def close(self, resolution: str = ""):
        """Fecha o incidente."""
        self.status = "FECHADO"
        if resolution:
            self.add_note(f"Resolução: {resolution}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "type": self.incident_type,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "affected_data": self.affected_data,
            "affected_users": self.affected_users,
            "source": self.source,
            "status": self.status,
            "notes": self.notes
        }


class IncidentHandler:
    """Gerencia incidentes de segurança."""
    
    def __init__(self, incident_log: str = "logs/incidents.jsonl"):
        self.incident_log = Path(incident_log)
        self.incident_log.parent.mkdir(exist_ok=True)
        self.incidents: Dict[str, Incident] = {}
    
    def report_incident(
        self,
        incident_type: str,
        severity: str,
        title: str,
        description: str,
        affected_data: Optional[List[str]] = None,
        affected_users: Optional[int] = None,
        notify: bool = True
    ) -> Incident:
        """
        Registra um novo incidente.
        
        Args:
            incident_type: Tipo de incidente
            severity: Nível de severidade
            title: Título
            description: Descrição
            affected_data: Tipos de dados afetados
            affected_users: Número de usuários afetados
            notify: Se deve notificar
        
        Returns:
            Instância de Incident
        """
        incident = Incident(
            incident_type=incident_type,
            severity=severity,
            title=title,
            description=description,
            affected_data=affected_data,
            affected_users=affected_users
        )
        
        # Armazenar
        self.incidents[incident.id] = incident
        self._save_incident(incident)
        
        logger.warning(
            f"⚠️ Incidente reportado [{incident.id}] "
            f"{severity}: {title}"
        )
        
        # Notificar se necessário
        if notify and severity in [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH]:
            self.notify_incident(incident)
        
        return incident
    
    def _save_incident(self, incident: Incident):
        """Salva incidente em log."""
        with open(self.incident_log, "a", encoding="utf-8") as f:
            f.write(json.dumps(incident.to_dict(), ensure_ascii=False) + "\n")
    
    def get_incident(self, incident_id: str) -> Optional[Incident]:
        """Recupera incidente por ID."""
        if incident_id in self.incidents:
            return self.incidents[incident_id]
        
        # Tentar carregar do log
        with open(self.incident_log, "r", encoding="utf-8") as f:
            for line in f:
                data = json.loads(line)
                if data["id"] == incident_id:
                    # Reconstruir Incident
                    inc = Incident(
                        incident_type=data["type"],
                        severity=data["severity"],
                        title=data["title"],
                        description=data["description"],
                        affected_data=data["affected_data"],
                        affected_users=data["affected_users"]
                    )
                    inc.id = data["id"]
                    inc.status = data["status"]
                    inc.notes = data["notes"]
                    return inc
        
        return None
    
    def notify_incident(self, incident: Incident):
        """Notifica equipe sobre incidente crítico."""
        try:
            # Tentar enviar email (se configurado)
            self._send_email_notification(incident)
            logger.info(f"✓ Notificação de incidente enviada: {incident.id}")
        except Exception as e:
            logger.error(f"Erro ao notificar incidente: {e}")
    
    def _send_email_notification(self, incident: Incident):
        """Envia notificação por email."""
        import os
        
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = os.getenv("SMTP_PORT", 587)
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASSWORD")
        recipient = os.getenv("INCIDENT_ALERT_EMAIL")
        
        if not all([smtp_host, smtp_user, smtp_pass, recipient]):
            logger.debug("Email de incidente não configurado (SMTP_*)")
            return
        
        subject = f"🚨 Incidente de Segurança [{incident.severity}]: {incident.title}"
        
        body = f"""
Incidente de Segurança Detectado

ID: {incident.id}
Severidade: {incident.severity}
Tipo: {incident.incident_type}
Título: {incident.title}

Descrição:
{incident.description}

Dados Afetados: {', '.join(incident.affected_data) if incident.affected_data else 'N/A'}
Usuários Afetados: {incident.affected_users or 'N/A'}
Timestamp: {incident.timestamp.isoformat()}

---
Verifique os logs para mais detalhes.
        """
        
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = recipient
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        
        server = smtplib.SMTP(smtp_host, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
    
    def get_open_incidents(self, severity: Optional[str] = None) -> List[Incident]:
        """Retorna incidentes abertos."""
        incidents = []
        
        with open(self.incident_log, "r", encoding="utf-8") as f:
            for line in f:
                data = json.loads(line)
                if data["status"] == "ABERTO":
                    if severity is None or data["severity"] == severity:
                        incidents.append(data)
        
        return incidents
    
    def generate_anpd_report(self, incident_ids: List[str] = None) -> Dict[str, Any]:
        """
        Gera relatório para notificação à ANPD (Autoridade Nacional de Proteção de Dados).
        
        Args:
            incident_ids: IDs dos incidentes (todos se None)
        
        Returns:
            Relatório estruturado
        """
        incidents = []
        
        with open(self.incident_log, "r", encoding="utf-8") as f:
            for line in f:
                data = json.loads(line)
                if incident_ids is None or data["id"] in incident_ids:
                    incidents.append(data)
        
        # Agrupar por severidade
        by_severity = {}
        for inc in incidents:
            sev = inc["severity"]
            if sev not in by_severity:
                by_severity[sev] = []
            by_severity[sev].append(inc)
        
        report = {
            "report_id": f"ANPD-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.now(UTC).isoformat(),
            "total_incidents": len(incidents),
            "by_severity": by_severity,
            "incidents": incidents,
            "notification_required": any(
                inc["severity"] in [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH]
                for inc in incidents
            )
        }
        
        return report
    
    def get_statistics(self) -> Dict[str, Any]:
        """Retorna estatísticas de incidentes."""
        incidents = []
        
        if not self.incident_log.exists():
            return {"total": 0, "by_severity": {}, "by_type": {}}
        
        with open(self.incident_log, "r", encoding="utf-8") as f:
            for line in f:
                incidents.append(json.loads(line))
        
        by_severity = {}
        by_type = {}
        
        for inc in incidents:
            # Por severidade
            sev = inc["severity"]
            by_severity[sev] = by_severity.get(sev, 0) + 1
            
            # Por tipo
            typ = inc["type"]
            by_type[typ] = by_type.get(typ, 0) + 1
        
        return {
            "total": len(incidents),
            "by_severity": by_severity,
            "by_type": by_type,
            "recent": incidents[-5:] if incidents else []
        }


# Instância global
_incident_handler = None


def get_incident_handler() -> IncidentHandler:
    """Retorna instância singleton."""
    global _incident_handler
    if _incident_handler is None:
        _incident_handler = IncidentHandler()
    return _incident_handler
