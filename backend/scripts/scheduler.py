#!/usr/bin/env python3
"""
Scheduler para tarefas automáticas (limpeza, monitoramento, etc).

Uso:
    python scripts/scheduler.py --cleanup     # Executar limpeza
    python scripts/scheduler.py --report      # Gerar relatório
    python scripts/scheduler.py --daemon      # Rodar em background (daemon)

Para cronjob (cron):
    # Executar limpeza todos os dias às 2am
    0 2 * * * cd /path/gestao_clinica && python scripts/scheduler.py --cleanup
    
    # Gerar relatório toda segunda-feira às 8am
    0 8 * * 1 cd /path/gestao_clinica && python scripts/scheduler.py --report
"""

import argparse
import time
import json
from datetime import datetime
from pathlib import Path
from utils.retention import run_scheduled_cleanup
from utils.logger import get_logger
from services.incident_handler import get_incident_handler

logger = get_logger("scheduler")


def run_cleanup():
    """Executa limpeza de dados antigos."""
    logger.info("⏱️ Iniciando limpeza agendada...")
    try:
        result = run_scheduled_cleanup()
        logger.info(
            f"✓ Limpeza concluída: "
            f"audit={result['audit_logs']}, "
            f"temp={result['temp_files']}, "
            f"errors={result['error_logs']}, "
            f"total={result['total']}"
        )
        return result
    except Exception as e:
        logger.error(f"✗ Erro em limpeza: {e}")
        raise


def generate_report():
    """Gera relatório de incidentes e status."""
    logger.info("📊 Gerando relatório...")
    try:
        handler = get_incident_handler()
        
        stats = handler.get_statistics()
        report = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "incident_stats": stats,
            "open_incidents": handler.get_open_incidents(),
        }
        
        # Salvar relatório
        report_path = Path("logs") / f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✓ Relatório salvo: {report_path}")
        return report
    except Exception as e:
        logger.error(f"✗ Erro ao gerar relatório: {e}")
        raise


def run_daemon(interval: int = 3600):
    """Executa scheduler em daemon (background)."""
    logger.info(f"🔄 Iniciando daemon com intervalo de {interval}s")
    
    try:
        while True:
            try:
                logger.info("---")
                run_cleanup()
                logger.info("---")
                logger.info(f"Próxima execução em {interval}s ({interval/3600:.1f} horas)")
                time.sleep(interval)
            except Exception as e:
                logger.error(f"Erro em execução: {e}")
                logger.info(f"Tentando novamente em 60s...")
                time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Daemon interrompido (Ctrl+C)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scheduler de tarefas automáticas")
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--cleanup",
        action="store_true",
        help="Executar limpeza de dados antigos"
    )
    group.add_argument(
        "--report",
        action="store_true",
        help="Gerar relatório de incidentes"
    )
    group.add_argument(
        "--daemon",
        action="store_true",
        help="Rodar em background (daemon)"
    )
    
    parser.add_argument(
        "--interval",
        type=int,
        default=3600,
        help="Intervalo entre execuções (segundos) para daemon [default: 3600]"
    )
    
    args = parser.parse_args()
    
    try:
        if args.cleanup:
            run_cleanup()
        elif args.report:
            generate_report()
        elif args.daemon:
            run_daemon(args.interval)
    except Exception as e:
        logger.error(f"Erro fatal: {e}")
        exit(1)
