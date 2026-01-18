// 1. CONFIGURAÇÃO DO FIREBASE (Extraído da sua imagem)
const firebaseConfig = {
    apiKey: "AIzaSyCW84493EhzeIRXpiu9ZYrGkt1wD5UY0yg",
    authDomain: "escala-tars.firebaseapp.com",
    projectId: "escala-tars",
    storageBucket: "escala-tars.firebasestorage.app",
    messagingSenderId: "766049652867",
    appId: "1:766049652867:web:d3aa722a44f39eb1a88bb6",
    measurementId: "G-96MEYHXJ4C"
};

// Inicialização
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const USUARIO_MESTRE = "admin";
const SENHA_MESTRE = "1234";

let colaboradores = []; // Agora inicia vazio e carrega do banco
let dataAtual = new Date(2026, 0, 1); 

const tableBody = document.getElementById('tableBody');
const daysRow = document.getElementById('daysRow');
const displayMesAno = document.getElementById('displayMesAno');

const CONFIG_TURNOS = [
    { nome: "MANHÃ SUP", temContador: false },
    { nome: "MANHÃ ENF", temContador: true },
    { nome: "MANHÃ TEC", temContador: true },
    { nome: "TARDE ENF", temContador: true },
    { nome: "TARDE TEC", temContador: true },
    { nome: "NOTURNO A", temContador: false },
    { nome: "NOTURNO A TEC", temContador: true },
    { nome: "NOTURNO B", temContador: false },
    { nome: "NOTURNO B TEC", temContador: true },
    { nome: "AUXILIAR ADM", temContador: false },
    { nome: "LICENÇA MÉDICA", temContador: false }
];

// 2. FUNÇÕES DE LOGIN E INICIALIZAÇÃO
window.onload = function() {
    if (sessionStorage.getItem("logado") === "true") exibirEscala();
};

function verificarEnter(event) { if (event.key === "Enter") realizarLogin(); }

function realizarLogin() {
    const user = document.getElementById("usuario").value;
    const pass = document.getElementById("senha").value;
    if (user === USUARIO_MESTRE && pass === SENHA_MESTRE) {
        sessionStorage.setItem("logado", "true");
        exibirEscala();
    } else { document.getElementById("loginErro").style.display = "block"; }
}

// 3. CONEXÃO EM TEMPO REAL (Substitui o carregar do localStorage)
function exibirEscala() {
    document.getElementById("loginOverlay").style.display = "none";
    document.getElementById("conteudoEscala").style.display = "block";
    
    // Escuta o banco de dados: se mudar no Firebase, atualiza a tela na hora
    db.collection("escalas").doc("geral").onSnapshot((doc) => {
        if (doc.exists) {
            colaboradores = doc.data().colaboradores || [];
        }
        atualizarTabela();
    });
}

// 4. FUNÇÃO DE SALVAR NA NUVEM (Substitui o salvarNoNavegador)
async function salvarNoFirebase() {
    try {
        await db.collection("escalas").doc("geral").set({ colaboradores });
        console.log("Sincronizado com Firebase");
    } catch (e) {
        console.error("Erro ao salvar no Firebase: ", e);
    }
}

function logout() { sessionStorage.removeItem("logado"); location.reload(); }
function botaoSalvarManual() { salvarNoFirebase(); alert("Escala TARS sincronizada na nuvem!"); }

function limparEscalaMes() {
    if (confirm("Limpar todas as marcações deste mês?")) {
        const ano = dataAtual.getFullYear(), mes = dataAtual.getMonth();
        colaboradores.forEach(p => { if (p.escala?.[ano]?.[mes]) p.escala[ano][mes] = {}; });
        salvarNoFirebase(); // Alterado de salvarNoNavegador
    }
}

function mudarMes(delta) { dataAtual.setMonth(dataAtual.getMonth() + delta); atualizarTabela(); }

// 5. RENDERIZAÇÃO DA TABELA (Mantida igual ao seu original)
function atualizarTabela() {
    if (sessionStorage.getItem("logado") !== "true") return;
    const ano = dataAtual.getFullYear(), mes = dataAtual.getMonth();
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    displayMesAno.innerText = `${nomesMeses[mes]}, ${ano}`;

    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
    document.getElementById('headerEscalaMensal').colSpan = ultimoDiaMes;
    
    let daysHtml = `<th class="col-dados-auto">Matrícula</th><th class="col-dados-auto">Nome</th><th class="col-dados-auto">Venc. COREN</th><th class="col-dados-auto">Nº COREN</th><th class="col-dados-auto">Cargo</th><th class="col-dados-auto">Horário</th><th class="col-dados-auto">Última Folga</th>`;
    for (let i = 1; i <= ultimoDiaMes; i++) {
        const fds = ([0, 6].includes(new Date(ano, mes, i).getDay()));
        daysHtml += `<th class="col-dia ${fds ? 'weekend-cell' : ''}">${i.toString().padStart(2, '0')}</th>`;
    }
    daysRow.innerHTML = daysHtml + `<th class="col-dia">Soma</th>`;

    tableBody.innerHTML = '';
    CONFIG_TURNOS.forEach(turno => renderizarTurno(turno, ano, mes, ultimoDiaMes));
}

function renderizarTurno(turnoObj, ano, mes, ultimoDia) {
    const lista = colaboradores.filter(c => c.turno === turnoObj.nome);
    const trTitle = document.createElement('tr');
    trTitle.className = 'row-turno-header';
    trTitle.innerHTML = `<td colspan="${ultimoDia + 8}" style="text-align:center;">${turnoObj.nome}</td>`;
    tableBody.appendChild(trTitle);

    if (lista.length === 0) return;
    let contagemPlatao = new Array(ultimoDia + 1).fill(0);

    lista.forEach(func => {
        const fIdx = colaboradores.indexOf(func);
        const tr = document.createElement('tr');
        let totalF = 0, diasInfo = [];

        for (let d = 1; d <= ultimoDia; d++) {
            const valor = (func.escala?.[ano]?.[mes]?.[d]) || "";
            if (valor.toUpperCase() === 'F') totalF++;
            diasInfo[d] = { valor, alert: false };
        }

        let diasSeguidos = 0;
        for (let d = 1; d <= ultimoDia; d++) {
            if (diasInfo[d].valor === "") {
                diasSeguidos++;
                if (diasSeguidos >= 7) for (let k = d - diasSeguidos + 1; k <= d; k++) diasInfo[k].alert = true;
            } else { diasSeguidos = 0; }
        }

        let htmlDias = "";
        for (let d = 1; d <= ultimoDia; d++) {
            const info = diasInfo[d];
            const isFds = ([0, 6].includes(new Date(ano, mes, d).getDay()));
            if (info.valor === "") contagemPlatao[d]++;
            htmlDias += `<td class="col-dia ${info.alert ? 'cell-day-alert' : (isFds ? 'weekend-cell' : '')}" onclick="digitarDia(${fIdx}, ${d})">${info.valor || '&nbsp;'}</td>`;
        }

        tr.innerHTML = `<td>${func.matricula || '-'}</td><td class="col-dados-auto" style="color:var(--tars-blue); font-weight:bold;">${func.nome} <span class="btn-edit-dots" onclick="abrirMenuEdicao(${fIdx})">⋮</span></td><td>${func.vencCoren || '-'}</td><td>${func.numCoren || '-'}</td><td>${func.cargo || '-'}</td><td>${func.horario || '-'}</td><td>${func.ultimaFolga || '-'}</td>${htmlDias}<td style="font-weight:bold;">${totalF}</td>`;
        tableBody.appendChild(tr);
    });

    if (turnoObj.temContador) {
        const trCount = document.createElement('tr');
        trCount.className = 'row-count';
        let label = turnoObj.nome.includes("ENF") ? "QUANTIDADE DE ENFERMEIROS" : "QUANTIDADE DE TÉCNICOS";
        let htmlCount = `<td colspan="7" style="text-align:right; padding-right:10px;">${label}</td>`;
        for (let d = 1; d <= ultimoDia; d++) htmlCount += `<td class="col-dia">${contagemPlatao[d]}</td>`;
        trCount.innerHTML = htmlCount + `<td></td>`;
        tableBody.appendChild(trCount);
    }
}

// 6. FUNÇÕES DE EDIÇÃO (Agora chamam salvarNoFirebase)
function digitarDia(fIdx, dia) {
    const ano = dataAtual.getFullYear(), mes = dataAtual.getMonth();
    const novo = prompt(`Dia ${dia} - Marcação (Ex: F, FH, LM, T, M):`, colaboradores[fIdx].escala?.[ano]?.[mes]?.[dia] || '');
    if (novo !== null) {
        if (!colaboradores[fIdx].escala) colaboradores[fIdx].escala = {};
        if (!colaboradores[fIdx].escala[ano]) colaboradores[fIdx].escala[ano] = {};
        if (!colaboradores[fIdx].escala[ano][mes]) colaboradores[fIdx].escala[ano][mes] = {};
        colaboradores[fIdx].escala[ano][mes][dia] = novo.toUpperCase().trim();
        salvarNoFirebase(); // Alterado
    }
}

function adicionarFuncionario() {
    const nome = prompt("Nome completo:");
    if (!nome) return;
    let menuTurnos = "Selecione o Turno:\n";
    CONFIG_TURNOS.forEach((t, i) => menuTurnos += `${i+1} - ${t.nome}\n`);
    const escolha = prompt(menuTurnos);
    const turnoSelecionado = CONFIG_TURNOS[parseInt(escolha)-1]?.nome || CONFIG_TURNOS[0].nome;

    colaboradores.push({
        nome, turno: turnoSelecionado,
        matricula: prompt("Matrícula:"), vencCoren: prompt("Venc. COREN:"),
        numCoren: prompt("Nº COREN:"), cargo: prompt("Cargo:"),
        horario: prompt("Horário:"), ultimaFolga: prompt("Última Folga:"),
        escala: {}
    });
    salvarNoFirebase(); // Alterado
}

function abrirMenuEdicao(idx) {
    const p = colaboradores[idx];
    const op = prompt("1-Editar Dados\n2-Remover Profissional");
    if (op === "1") {
        p.nome = prompt("Nome:", p.nome);
        let menuTurnos = "Alterar Turno:\n";
        CONFIG_TURNOS.forEach((t, i) => menuTurnos += `${i+1} - ${t.nome}\n`);
        const escolha = prompt(menuTurnos);
        if (escolha) p.turno = CONFIG_TURNOS[parseInt(escolha)-1]?.nome || p.turno;
        p.matricula = prompt("Matrícula:", p.matricula);
        p.vencCoren = prompt("Venc COREN:", p.vencCoren);
        p.numCoren = prompt("Nº COREN:", p.numCoren);
        p.cargo = prompt("Cargo:", p.cargo);
        p.horario = prompt("Horário:", p.horario);
        p.ultimaFolga = prompt("Última Folga:", p.ultimaFolga);
        salvarNoFirebase(); // Alterado
    } else if (op === "2") {
        if(confirm(`Remover ${p.nome}?`)) colaboradores.splice(idx, 1);
        salvarNoFirebase(); // Alterado
    }
}
