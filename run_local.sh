#!/bin/bash
# Script para rodar Gerador de Laudos localmente
# 
# Uso:
#   bash run_local.sh streamlit    # Usa Streamlit
#   bash run_local.sh flask        # Usa Flask
#   bash run_local.sh              # Menu interativo

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/media/jean/7AF8AFA7F8AF5FDD/gestao_clinica"

# ────────────────────────────────────────────────────────────────
# Funções
# ────────────────────────────────────────────────────────────────

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ────────────────────────────────────────────────────────────────
# Verificações
# ────────────────────────────────────────────────────────────────

check_requirements() {
    print_header "Verificando Requisitos"
    
    # Verificar Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_success "Python encontrado: $PYTHON_VERSION"
    else
        print_error "Python3 não encontrado!"
        exit 1
    fi
    
    # Verificar venv
    if [[ -d "$PROJECT_DIR/.venv" ]]; then
        print_success "Ambiente virtual encontrado"
    else
        print_error "Ambiente virtual não encontrado em $PROJECT_DIR/.venv"
        exit 1
    fi
    
    # Verificar .env
    if [[ -f "$PROJECT_DIR/.env" ]]; then
        print_success "Arquivo .env encontrado"
    else
        print_warning "Arquivo .env não encontrado"
    fi
    
    # Verificar credentials.json
    if [[ -f "$PROJECT_DIR/credentials.json" ]]; then
        print_success "credentials.json encontrado"
    else
        print_warning "credentials.json não encontrado (necessário para autenticação)"
    fi
}

# ────────────────────────────────────────────────────────────────
# Ativar Ambiente Virtual
# ────────────────────────────────────────────────────────────────

activate_venv() {
    print_header "Ativando Ambiente Virtual"
    
    source "$PROJECT_DIR/.venv/bin/activate"
    print_success "Ambiente virtual ativado"
    
    # Verificar se foi ativado
    if [[ "$VIRTUAL_ENV" == "$PROJECT_DIR/.venv" ]]; then
        print_success "Python: $(which python)"
        print_success "pip: $(which pip)"
    fi
}

# ────────────────────────────────────────────────────────────────
# Executar Streamlit
# ────────────────────────────────────────────────────────────────

run_streamlit() {
    print_header "Iniciando Streamlit"
    
    print_info "Verificando se Streamlit está instalado..."
    if ! pip show streamlit &> /dev/null; then
        print_warning "Streamlit não instalado. Instalando..."
        pip install streamlit
    fi
    
    print_success "Iniciando app_laudos_local.py"
    print_info "Acesse: ${GREEN}http://localhost:8501${NC}"
    print_info "Pressione CTRL+C para parar\n"
    
    cd "$PROJECT_DIR"
    streamlit run app_laudos_local.py
}

# ────────────────────────────────────────────────────────────────
# Executar Flask
# ────────────────────────────────────────────────────────────────

run_flask() {
    print_header "Iniciando Flask"
    
    print_info "Verificando se Flask está instalado..."
    if ! pip show flask &> /dev/null; then
        print_warning "Flask não instalado. Instalando..."
        pip install flask
    fi
    
    print_success "Iniciando api_laudos_local.py"
    print_info "Acesse: ${GREEN}http://localhost:5000${NC}"
    print_info "Pressione CTRL+C para parar\n"
    
    cd "$PROJECT_DIR"
    python api_laudos_local.py
}

# ────────────────────────────────────────────────────────────────
# Testar Conexão
# ────────────────────────────────────────────────────────────────

test_connection() {
    print_header "Testando Conexão Google Docs API"
    
    python3 << 'EOF'
try:
    from services.google_docs_api import get_google_docs_api
    from services.laudo_service import get_laudo_service
    
    print("⏳ Conectando ao Google Docs API...")
    api = get_google_docs_api()
    print("✅ Google Docs API: OK")
    
    laudo_service = get_laudo_service()
    print("✅ Laudo Service: OK")
    print(f"✅ Template ID: {laudo_service.template_id[:30]}...")
    
except Exception as e:
    print(f"❌ Erro: {e}")
    exit(1)
EOF
    
    if [[ $? -eq 0 ]]; then
        print_success "Conexão testada com sucesso!"
    else
        print_error "Falha ao testar conexão"
        exit 1
    fi
}

# ────────────────────────────────────────────────────────────────
# Menu
# ────────────────────────────────────────────────────────────────

show_menu() {
    print_header "Gerador de Laudos - Menu Local"
    
    echo "Escolha uma opção:"
    echo ""
    echo "  1) 🌐 Streamlit (http://localhost:8501)"
    echo "  2) ⚡ Flask (http://localhost:5000)"
    echo "  3) 🧪 Testar Conexão"
    echo "  4) 📚 Ver Documentação"
    echo "  5) ❌ Sair"
    echo ""
    read -p "Opção (1-5): " choice
    
    case $choice in
        1) run_streamlit ;;
        2) run_flask ;;
        3) test_connection ;;
        4) 
            echo ""
            echo "Documentação disponível:"
            echo "  - LOCALHOST_README.md"
            echo "  - GOOGLE_DOCS_SETUP.md"
            echo "  - examples/exemplo_laudos.py"
            echo ""
            read -p "Pressione ENTER para voltar ao menu"
            show_menu
            ;;
        5) 
            echo -e "${GREEN}Até logo!${NC}\n"
            exit 0
            ;;
        *)
            print_error "Opção inválida"
            show_menu
            ;;
    esac
}

# ────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────

main() {
    # Header
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║     🏥 Gerador de Laudos - Teste Local                       ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Verificar requisitos
    check_requirements
    
    # Ativar venv
    activate_venv
    
    # Mudar para diretório do projeto
    cd "$PROJECT_DIR"
    
    # Processar argumentos
    if [[ -z "$1" ]]; then
        # Sem argumentos: mostrar menu
        show_menu
    else
        # Com argumentos: executar diretamente
        case "$1" in
            streamlit)
                run_streamlit
                ;;
            flask)
                run_flask
                ;;
            test)
                test_connection
                ;;
            *)
                print_error "Opção desconhecida: $1"
                echo ""
                echo "Uso: bash run_local.sh [streamlit|flask|test]"
                exit 1
                ;;
        esac
    fi
}

# Executar
main "$@"
