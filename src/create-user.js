const http = require("http");

const data = JSON.stringify({
  nome: "Admin",
  email: "admin@bombeiros.com",
  senha: "123456",
  cargo: "Administrador",
  departamento: "Operacoes",
  telefone: "81999999999",
});

const options = {
  hostname: "localhost",
  port: 3001,
  path: "/api/auth/register",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => console.log("Resposta:", body));
});

req.on("error", (e) => console.error("Erro:", e.message));
req.write(data);
req.end();
