"""
API Flask Local para Testar Google Docs

Rode com:
    python api_laudos_local.py

Acesse:
    http://localhost:5000
    http://localhost:5000/api/gerar-laudo (POST)
"""

from flask import Flask, render_template_string, request, jsonify
from datetime import datetime
from pathlib import Path
import json
import os
import stat
from utils.audit import log_event
from utils.rate_limiter import setup_rate_limiting
from services.incident_handler import get_incident_handler, IncidentSeverity, IncidentType

app = Flask(__name__)

# Setup rate limiting (100 requisições por hora por IP)
setup_rate_limiting(app)

# ────────────────────────────────────────────────────────────────
# HTML Template para Interface
# ────────────────────────────────────────────────────────────────

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerador de Laudos - Localhost</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        header h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        header p {
            color: #666;
            font-size: 14px;
        }
        
        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .card h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 18px;
        }
        
        .card label {
            display: block;
            margin-bottom: 15px;
            color: #333;
            font-weight: 500;
        }
        
        .card label small {
            display: block;
            color: #999;
            font-weight: normal;
            margin-top: 5px;
            font-size: 12px;
        }
        
        .card input,
        .card textarea,
        .card select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-family: inherit;
            margin-bottom: 5px;
        }
        
        .card textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .checkbox-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .checkbox-group label {
            display: flex;
            align-items: center;
            margin-bottom: 0;
        }
        
        .checkbox-group input[type="checkbox"] {
            width: auto;
            margin-right: 10px;
        }
        
        .button-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 20px;
        }
        
        button {
            padding: 12px 20px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }
        
        .btn-secondary:hover {
            background: #e0e0e0;
        }
        
        .status {
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
            display: none;
        }
        
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            display: block;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            display: block;
        }
        
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
            display: block;
        }
        
        .status.loading {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            display: block;
        }
        
        .result {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #667eea;
            font-family: monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            display: none;
        }
        
        .result.show {
            display: block;
        }
        
        .link-button {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 10px;
        }
        
        .link-button:hover {
            background: #218838;
        }
        
        footer {
            background: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 768px) {
            .content {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📄 Gerador de Laudos</h1>
            <p>🔗 localhost:5000 | Ambiente de Teste Local</p>
        </header>
        
        <div class="content">
            <!-- Formulário -->
            <form id="formLaudo" class="card">
                <h2>Dados do Paciente</h2>
                
                <div id="status"></div>
                
                <label>
                    Nome Completo
                    <small>Obrigatório</small>
                    <input type="text" id="nome_paciente" required placeholder="João Silva Santos">
                </label>
                
                <label>
                    CPF
                    <small>Formato: 000.000.000-00</small>
                    <input type="text" id="cpf" required placeholder="123.456.789-00">
                </label>
                
                <label>
                    Data de Nascimento
                    <small>DD/MM/YYYY</small>
                    <input type="date" id="data_nascimento" required>
                </label>
                
                <label>
                    Empresa
                    <small>Nome da empresa</small>
                    <input type="text" id="empresa" required placeholder="Empresa XYZ LTDA">
                </label>
                
                <label>
                    Data do Exame
                    <small>Formato: DD/MM/YYYY</small>
                    <input type="date" id="data_exame" required>
                </label>
                
                <label>
                    Motivo da Avaliação
                    <small>Descrição do motivo</small>
                    <textarea id="motivo_avaliacao" placeholder="Avaliação para..."></textarea>
                </label>
                
                <label>Tipo de Avaliação:</label>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="admissional"> Admissional
                    </label>
                    <label>
                        <input type="checkbox" id="periodica"> Periódica
                    </label>
                    <label>
                        <input type="checkbox" id="pessoal"> Pessoal
                    </label>
                    <label>
                        <input type="checkbox" id="mudanca_funcao"> Mudança Função
                    </label>
                </div>
                
                <label>
                    Itens Auxiliares
                    <small>Testes realizados, observações...</small>
                    <textarea id="itens_auxiliados" placeholder="• Teste 1&#10;• Teste 2"></textarea>
                </label>
                
                <label>
                    Conclusão
                    <small>Resultado da avaliação</small>
                    <textarea id="conclusao" placeholder="Resultado e recomendações..."></textarea>
                </label>
                
                <label>
                    Psicólogo(a)
                    <small>Nome completo</small>
                    <input type="text" id="psicologista_nome" value="Dra. Juliana Feitosa">
                </label>
                
                <label>
                    CRP
                    <small>Conselho Regional de Psicologia</small>
                    <input type="text" id="psicologista_crp" value="07/12345">
                </label>
                
                <div class="button-group">
                    <button type="submit" class="btn-primary">🚀 Gerar Laudo</button>
                    <button type="reset" class="btn-secondary">🔄 Limpar</button>
                </div>
            </form>
            
            <!-- Resultado -->
            <div class="card">
                <h2>Resultado</h2>
                
                <div id="result" class="result"></div>
                
                <div id="googleLink" style="display: none;">
                    <p style="margin-bottom: 10px;">✅ Laudo gerado com sucesso!</p>
                    <a id="linkGoogleDocs" class="link-button" target="_blank">
                        🔗 Abrir no Google Docs
                    </a>
                </div>
                
                <div id="debugInfo">
                    <h3 style="margin-top: 20px; color: #333;">🔧 Informações de Debug</h3>
                    <p style="color: #666; font-size: 12px;">
                        Endpoint: <code>/api/gerar-laudo</code><br>
                        Método: <code>POST</code><br>
                        Content-Type: <code>application/json</code>
                    </p>
                </div>
            </div>
        </div>
        
        <footer>
            <p>
                💡 <strong>Dica:</strong> Verifique o console do navegador (F12) para mensagens de debug<br>
                📚 Leia <code>GOOGLE_DOCS_SETUP.md</code> para mais informações
            </p>
        </footer>
    </div>
    
    <script>
        // Preencher data de hoje por padrão
        document.getElementById('data_exame').valueAsDate = new Date();
        
        // Enviar formulário
        document.getElementById('formLaudo').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const statusDiv = document.getElementById('status');
            const resultDiv = document.getElementById('result');
            const googleLink = document.getElementById('googleLink');
            
            // Mostrar carregamento
            statusDiv.className = 'status loading';
            statusDiv.textContent = '⏳ Gerando laudo...';
            resultDiv.classList.remove('show');
            googleLink.style.display = 'none';
            
            try {
                // Coletar dados
                const dados = {
                    nome_paciente: document.getElementById('nome_paciente').value,
                    cpf: document.getElementById('cpf').value,
                    data_nascimento: document.getElementById('data_nascimento').value.replace(/-/g, '/').split('/').reverse().join('/'),
                    empresa: document.getElementById('empresa').value,
                    data_exame: document.getElementById('data_exame').value.replace(/-/g, '/').split('/').reverse().join('/'),
                    motivo_avaliacao: document.getElementById('motivo_avaliacao').value,
                    admissional: document.getElementById('admissional').checked,
                    periodica: document.getElementById('periodica').checked,
                    pessoal: document.getElementById('pessoal').checked,
                    mudanca_funcao: document.getElementById('mudanca_funcao').checked,
                    itens_auxiliados: document.getElementById('itens_auxiliados').value,
                    conclusao: document.getElementById('conclusao').value,
                    psicologista_nome: document.getElementById('psicologista_nome').value,
                    psicologista_crp: document.getElementById('psicologista_crp').value,
                };
                
                // Enviar para API
                const response = await fetch('/api/gerar-laudo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dados)
                });
                
                const resultado = await response.json();
                
                if (response.ok) {
                    statusDiv.className = 'status success';
                    statusDiv.textContent = '✅ Laudo gerado com sucesso!';
                    
                    resultDiv.textContent = JSON.stringify(resultado, null, 2);
                    resultDiv.classList.add('show');
                    
                    // Mostrar link do Google Docs
                    if (resultado.url) {
                        document.getElementById('linkGoogleDocs').href = resultado.url;
                        googleLink.style.display = 'block';
                    }
                } else {
                    statusDiv.className = 'status error';
                    statusDiv.textContent = '❌ Erro: ' + (resultado.erro || 'Desconhecido');
                    
                    resultDiv.textContent = JSON.stringify(resultado, null, 2);
                    resultDiv.classList.add('show');
                }
            } catch (erro) {
                statusDiv.className = 'status error';
                statusDiv.textContent = '❌ Erro de conexão: ' + erro.message;
                
                resultDiv.textContent = erro.stack;
                resultDiv.classList.add('show');
            }
        });
    </script>
</body>
</html>
"""


# ────────────────────────────────────────────────────────────────
# ROTAS
# ────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def index():
    """Página inicial com formulário."""
    return render_template_string(HTML_TEMPLATE)


@app.route("/api/status", methods=["GET"])
def status():
    """Verificar status da API."""
    try:
        from services.google_docs_api import get_google_docs_api
        from services.laudo_service import get_laudo_service

        api = get_google_docs_api()
        laudo_service = get_laudo_service()

        return jsonify({
            "status": "✅ OK",
            "google_docs_api": "Conectado",
            "laudo_service": "Pronto",
            "template_id": laudo_service.template_id[:20] + "..." if laudo_service.template_id else "NÃO CONFIGURADO",
        })
    except Exception as e:
        return jsonify({"status": "❌ ERRO", "erro": str(e)}), 500


@app.route("/api/gerar-laudo", methods=["POST"])
def gerar_laudo():
    """Gerar novo laudo."""
    try:
        from services.laudo_service import get_laudo_service, DadosLaudo

        dados_json = request.get_json()

        # Validar dados
        if not dados_json.get("nome_paciente"):
            return jsonify({"erro": "Nome do paciente é obrigatório"}), 400

        if not dados_json.get("cpf"):
            return jsonify({"erro": "CPF é obrigatório"}), 400

        # Criar DadosLaudo
        dados = DadosLaudo(
            nome_paciente=dados_json["nome_paciente"],
            data_nascimento=dados_json.get("data_nascimento", "01/01/2000"),
            cpf=dados_json["cpf"],
            empresa=dados_json.get("empresa", ""),
            data_exame=dados_json.get("data_exame", ""),
            motivo_avaliacao=dados_json.get("motivo_avaliacao", ""),
            admissional=dados_json.get("admissional", False),
            periodica=dados_json.get("periodica", False),
            pessoal=dados_json.get("pessoal", False),
            mudanca_funcao=dados_json.get("mudanca_funcao", False),
            itens_auxiliados=dados_json.get("itens_auxiliados", ""),
            conclusao=dados_json.get("conclusao", ""),
            psicologista_nome=dados_json.get("psicologista_nome", "Psicólogo"),
            psicologista_crp=dados_json.get("psicologista_crp", ""),
        )

        # Gerar laudo
        laudo_service = get_laudo_service()
        novo_doc = laudo_service.gerar_laudo(dados)

        return jsonify({
            "sucesso": True,
            "id": novo_doc["id"],
            "titulo": novo_doc["title"],
            "url": novo_doc["url"],
        })

    except ValueError as e:
        return jsonify({"erro": str(e)}), 400
    except Exception as e:
        return jsonify({"erro": f"Erro ao gerar laudo: {str(e)}"}), 500


@app.route("/api/test", methods=["GET"])
def test():
    """Endpoint de teste rápido."""
    return jsonify({
        "teste": "OK",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "GET /": "Interface web",
            "GET /api/status": "Status da API",
            "POST /api/gerar-laudo": "Gerar novo laudo",
            "GET /api/test": "Este teste",
        }
    })


    @app.route("/api/dados/<cpf>", methods=["GET"])
    def dados_paciente(cpf: str):
        """Recupera metadados do paciente por CPF (simulado).

        Nota: em produção isso deveria ser autenticado e consultar um banco de dados.
        """
        try:
            data_dir = Path("data")
            data_dir.mkdir(exist_ok=True)
            records_file = data_dir / "patient_records.json"

            if not records_file.exists():
                return jsonify({"erro": "Nenhum registro encontrado"}), 404

            records = json.loads(records_file.read_text(encoding="utf-8"))
            record = records.get(cpf)
            if not record:
                return jsonify({"erro": "Paciente não encontrado"}), 404

            # Registrar auditoria de acesso
            try:
                log_event("dados_acessados", {"cpf_hash": cpf[-6:], "action": "consulta_api"})
            except Exception:
                pass

            return jsonify({"sucesso": True, "dados": record})
        except Exception as e:
            return jsonify({"erro": str(e)}), 500


    @app.route("/api/dados", methods=["POST"])
    def salvar_dados_paciente():
        """Salvar ou atualizar metadados do paciente (simulado)."""
        try:
            payload = request.get_json()
            cpf = payload.get("cpf")
            if not cpf:
                return jsonify({"erro": "CPF é obrigatório"}), 400

            data_dir = Path("data")
            data_dir.mkdir(exist_ok=True)
            records_file = data_dir / "patient_records.json"

            records = {}
            if records_file.exists():
                records = json.loads(records_file.read_text(encoding="utf-8"))

            # Minimizar dados armazenados
            records[cpf] = {
                "nome": payload.get("nome_paciente"),
                "cpf_hash": cpf[-6:],
                "ultima_atualizacao": datetime.utcnow().isoformat() + "Z",
            }

            records_file.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

            try:
                log_event("dados_salvos", {"cpf_hash": cpf[-6:]})
            except Exception:
                pass

            return jsonify({"sucesso": True})
        except Exception as e:
            return jsonify({"erro": str(e)}), 500


    @app.route("/api/dados/<cpf>", methods=["DELETE"])
    def excluir_dados_paciente(cpf: str):
        """Excluir dados do paciente (simulado)."""
        try:
            data_dir = Path("data")
            records_file = data_dir / "patient_records.json"
            if not records_file.exists():
                return jsonify({"erro": "Nenhum registro encontrado"}), 404

            records = json.loads(records_file.read_text(encoding="utf-8"))
            if cpf not in records:
                return jsonify({"erro": "Paciente não encontrado"}), 404

            del records[cpf]
            records_file.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

            try:
                log_event("dados_excluidos", {"cpf_hash": cpf[-6:]})
            except Exception:
                pass

            return jsonify({"sucesso": True})
        except Exception as e:
            return jsonify({"erro": str(e)}), 500


# ────────────────────────────────────────────────────────────────
# EXECUÇÃO
# ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🏥 Gerador de Laudos - Servidor Local")
    print("=" * 70)
    print("\n📍 Acessar em: http://localhost:5000")
    print("\n🔗 Endpoints disponíveis:")
    print("   - GET  http://localhost:5000/              (Interface web)")
    print("   - GET  http://localhost:5000/api/status    (Status)")
    print("   - POST http://localhost:5000/api/gerar-laudo (Gerar laudo)")
    print("   - GET  http://localhost:5000/api/test      (Teste)")
    print("\n💡 Pressione CTRL+C para parar\n")
    print("=" * 70 + "\n")

    # Checar permissões das credenciais locais
    cred_path = Path("credentials.json")
    if cred_path.exists():
        mode = cred_path.stat().st_mode & 0o777
        if (mode & 0o077) != 0 or (mode & 0o600) != 0o600:
            print("⚠️  Atenção: 'credentials.json' possui permissões inseguras:", oct(mode))
            print("Execute: chmod 600 credentials.json")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        use_reloader=True,
    )
