"use strict";

const crypto = require("crypto");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function enviarEmailVerificacao({ email, nome, token }) {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_FROM;
  if (!apiKey || !remetente) {
    throw new Error("Configure RESEND_API_KEY e EMAIL_FROM no backend/.env para enviar e-mails.");
  }

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const link = `${frontendUrl}/verificar-email?token=${encodeURIComponent(token)}`;
  const nomeSeguro = String(nome || "usuário").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remetente,
      to: [email],
      subject: "Confirme seu e-mail para acessar a Sorrisa",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.6">
          <h2 style="color:#2563eb">Bem-vindo à Sorrisa!</h2>
          <p>Olá, ${nomeSeguro}.</p>
          <p>Para confirmar que este endereço de e-mail é seu, clique no botão abaixo:</p>
          <p style="margin:28px 0"><a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:13px 22px;border-radius:8px;display:inline-block;font-weight:700">Verificar meu e-mail</a></p>
          <p>O link é válido por 30 minutos e pode ser utilizado uma única vez.</p>
          <p>Se você não solicitou este cadastro, ignore esta mensagem.</p>
          <p style="color:#64748b;font-size:12px">Sorrisa · Sistema de gestão odontológica</p>
        </div>
      `,
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(`Falha no provedor de e-mail (${resposta.status}): ${detalhe.slice(0, 300)}`);
  }
  return resposta.json().catch(() => ({}));
}

module.exports = { enviarEmailVerificacao, hashToken };
