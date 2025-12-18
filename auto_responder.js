require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');   // npm install node-fetch@2
const fs = require('fs');

const app = express();
const PORT = 3000;

const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(bodyParser.json());

// Archivo donde guardamos los números ya saludados
const GREETED_FILE = 'greeted.json';

// Cargar números ya saludados desde archivo
let greeted = new Set();
if (fs.existsSync(GREETED_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(GREETED_FILE, 'utf8'));
    greeted = new Set(data);
    console.log(`📂 Cargados ${greeted.size} números desde ${GREETED_FILE}`);
  } catch (err) {
    console.error("❌ Error leyendo greeted.json:", err);
  }
}

// Guardar números saludados en archivo
function saveGreeted() {
  fs.writeFileSync(GREETED_FILE, JSON.stringify([...greeted], null, 2));
}

// Función para enviar texto
async function sendText(to, body) {
  console.log(`📤 Texto -> ${to}: ${body}`);
  await fetch(`https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body }
    })
  });
}

// Función para enviar bienvenida
async function sendWelcome(to) {
  const bienvenida =
    "🙌 Bienvenido/a a Fundación IDEAR.\n" +
    "Impulsamos educación, innovación y desarrollo social en Misiones.\n\n" +
    "Elegí una opción para continuar:\n" +
    "🌐 Web: https://fundacionidear.org\n" +
    "📚 Programas: https://fundacionidear.org/programas\n" +
    "📞 Contacto: soporte@fundacionidear.org";
  await sendText(to, bienvenida);
}

// Webhook POST: mensajes entrantes
app.post('/api/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    const contact = changes?.value?.contacts?.[0];

    if (message) {
      const from = message.from;
      const name = contact?.profile?.name || "Desconocido";
      const text = message.text?.body || "";

      console.log("\n📩 NUEVO MENSAJE");
      console.log(`👤 Nombre: ${name}`);
      console.log(`📱 Número: ${from}`);
      console.log(`📝 Mensaje: ${text}`);

      // Si es un número nuevo, enviar bienvenida y guardarlo
      if (!greeted.has(from)) {
        greeted.add(from);
        saveGreeted();
        await sendWelcome(from);
        console.log(`✅ Bienvenida enviada automáticamente a ${from}`);
      }
    }
  } catch (err) {
    console.error("❌ Error al procesar mensaje:", err);
  }
  res.sendStatus(200);
});

// Webhook GET: verificación
app.get('/api/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Arranque + heartbeat
app.listen(PORT, () => {
  console.log(`🚀 Auto‑responder escuchando en http://localhost:${PORT}`);
  console.log("🛑 Presiona Ctrl+C para cerrar el servidor en cualquier momento.");
});
setInterval(() => {
  const now = new Date().toLocaleString();
  console.log(`⏳ Servidor activo (${now}), esperando mensajes...`);
}, 30000);
