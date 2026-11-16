import express from 'express';
import dotenv from 'dotenv';
import { pool } from './config/database.js';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors());
app.use(express.json())  



// ================= ROTA PARA REALIZAR PEDIDOS =================
app.post('/pedidos', async (req, res) => {
  const { token, produtos, endereco, formapagamneto } = req.body;

  // 1. Validação: confere token e se 'produtos' é uma lista com itens
  if (!token || !Array.isArray(produtos) || produtos.length === 0, !endereco, formapagamento) {
    return res.status(400).json({ error: 'Token e uma lista de produtos são obrigatórios.' });
  }

  try {
    // 2. Garante que a tabela de pedidos existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`venda\` (
        
       ID INT AUTO_INCREMENT PRIMARY KEY,
        CPF_CLIENTE VARCHAR(255) NOT NULL,
        [CÓDIGO PRODUTO] INT NOT NULL,
        QUANTIDADE INT DEFAULT 1,
        DATA_PEDIDO TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ENDEREÇO  VARCHAR(255) NOT NULL,
        FORMA DE PAGAMENTO  VARCHAR(255) NOT NULL,
        VALOR   DOUBLE  NOT NULL,
        
      )
    `);

    // 3. Busca o usuário correspondente ao token
    const [usuarios]: any = await pool.query(
      'SELECT CPF, NOME FROM `criar conta` WHERE TOKEN = ?',
      [token]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    // Correção: define usuarioLogado a partir do resultado da busca
    const usuarioLogado = usuarios[0];
    cost total = produtos.reduce((acc,item)=>acc+item["PREÇO DE VENDA"],0);

    // 4. Monta as linhas para inserir todos os itens no banco
    const valoresParaInserir = produtos.map((item: any) => [
      usuarioLogado.CPF,
      item.produtoId, 
      item.quantidade || 1,  
        endereco, formapagamneto, total
    ]);

    // 5. Inserção múltipla em lote (INSERT INTO ... VALUES ?)
    const queryMultipla = 'INSERT INTO `pedidos` (CPF_CLIENTE, PRODUTO_ID, QUANTIDADE, ENDEREÇO, `FORMA DE PAGAMENTO`, VALOR) VALUES ?';
    await pool.query(queryMultipla, [valoresParaInserir]);

    // 6. Retorna o sucesso informando a quantidade de itens salvos
    return res.status(201).json({
      mensagem: 'Pedido realizado com sucesso!',
      cliente: usuarioLogado.NOME,
      totalItens: produtos.length, 
      total: total
    });

  } catch (error: any) {
    console.error('Erro ao salvar lista de pedidos:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar os pedidos.' });
  }
});


app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'E_mail e senha são obrigatórios.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT CPF, NOME, `E_MAIL` as email_banco, SENHA FROM `criar conta` WHERE `E-MAIL` = ?',
      [email]
    ) as any[];

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'E_mail ou senha incorretos.' });
    }

    const usuario = rows[0];

    if (usuario.SENHA !== senha) {
      return res.status(401).json({ error: 'E_mail ou senha incorretos.' });
    }

    const token = 'tk_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    await pool.query(
      'UPDATE `criar conta` SET TOKEN = ? WHERE CPF = ?',
      [token, usuario.CPF]
    );

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso!',
      token: token,
      usuario: {
        cpf: usuario.CPF,
        nome: usuario.NOME,
        email: usuario.email_banco
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro no servidor ao tentar logar.' });
  }
});

// ================= ROTA PARA CADASTRAR USUÁRIO =================
app.post('/usuarios', async (req, res) => {
  const { nome, email, cpf, senha } = req.body;

  // 1. Validação básica de entrada
  if (!nome || !email || !senha || !cpf) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    // 2. Garante que a tabela de usuários existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`criar conta\` (
        CPF VARCHAR(255) PRIMARY KEY,
        NOME VARCHAR(255) NOT NULL,
        E_MAIL VARCHAR(255) NOT NULL UNIQUE,
        SENHA VARCHAR(255) NOT NULL,
        DATA_CADASTRO TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

// 3. Verifica se o e-mail já está em uso
const [emailExistente]: any = await pool.query(
  'SELECT CPF FROM `criar conta` WHERE E_MAIL = ?',
  [email]
);

if (emailExistente.length > 0) {
  return res.status(409).json({ error: 'Este e_mail já está cadastrado.' });
}

// 3.1 Verifica se o CPF já está em uso (Evita quebra por Primary Key)
const [cpfExistente]: any = await pool.query(
  'SELECT CPF FROM `criar conta` WHERE CPF = ?',
  [cpf]
);

if (cpfExistente.length > 0) {
  return res.status(409).json({ error: 'Este CPF já está cadastrado.' });
}


   
    
    // 5. Salva o usuário no banco
    const queryInsercao = 'INSERT INTO `criar conta` (NOME, E_MAIL, SENHA, CPF) VALUES (?, ?, ?, ?)';
    const [result]: any = await pool.query(queryInsercao, [nome, email, senha, cpf]);

    // Retorna 201 Created sem expor a senha
    res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso!',
      usuario: {
        id: result.insertId,
        nome,
        email,
        senha,
        cpf,
      }
    });
  } catch (error: any) {
    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).json({ error: 'Erro interno ao salvar o usuário.' });
  }
});


// ================= ROTA PARA INSERIR PRODUTO (E CRIAR A TABELA SE NÃO EXISTIR) =================
app.post('/produtos', async (req, res) => {
const { nome, preco } = req.body;

// Validação simples
if (!nome || !preco) {
return res.status(400).json({ error: 'Nome e preço são obrigatórios.' });
}

try {
// 1. Cria a tabela 'produtos' se ela ainda não existir no banco
await pool.query(`
CREATE TABLE IF NOT EXISTS \`produtos\` (
id INT AUTO_INCREMENT PRIMARY KEY,
nome VARCHAR(255) NOT NULL,
preco DECIMAL(10, 2) NOT NULL,
criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

// 2. Insere o produto digitado pelo usuário
const queryCadastro = `INSERT INTO \`produtos\` (nome, preco) VALUES (?, ?)`;
await pool.query(queryCadastro, [nome, preco]);

res.status(201).json({ mensagem: 'Produtos inserido com sucesso!' });
} catch (error: any) {
console.error('Erro ao inserir produtos:', error);
res.status(500).json({ error: 'Erro interno ao salvar o produto.' });
}
});

// ================= ROTA PARA VISUALIZAR OS PRODUTOS =================
app.get('/produtos', async (req, res) => {
try {
// Verifica se a tabela existe antes de ler para evitar erro de tabela fantasma
const [tabelas]: any = await pool.query("SHOW TABLES LIKE 'produto'");

if (tabelas.length === 0) {
// Se a tabela não existe, significa que nenhum produto foi cadastrado ainda
return res.json([]);
}

const [rows] = await pool.query('SELECT * FROM `produto` ORDER BY `CODIGO DO PRODUTO` DESC');
res.json(rows);
} catch (error: any) {
console.error('Erro ao buscar produtos:', error);
res.status(500).json({ error: 'Erro ao buscar os produtos.' });
}
});

// Suas rotas antigas continuam aqui...
app.get('/descobrir-tabelas', async (req, res) => {
try {
const [rows]: any = await pool.query('SHOW TABLES');
const tabelas = rows.map((row: any) => Object.values(row)[0]);
res.json({ tabelas });
} catch (error) {
res.status(500).json({ error: 'Erro' });
}
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(`Servidor rodando na porta ${PORT} 🚀`);

// === NOVO TESTE DE CONEXÃO DIRETA COM O BANCO ===
pool.getConnection()
.then((connection) => {
console.log('✅ SUCESSO: O Node.js conseguiu conectar no banco MySQL!');
connection.release();
})
.catch((error) => {
console.log('\n❌ ERRO CRÍTICO NO BANCO DE DADOS:');
console.log(error.message);
console.log('Verifique a senha, o usuário ou se o servidor robb0253.publiccloud.com.br está bloqueando conexões externas.\n');
});
});
