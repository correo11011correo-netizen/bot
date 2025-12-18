require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');   // asegúrate de instalar: npm install node-fetch
const readline = require('readline');

const app = express();
const PORT = 3000;

const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(bodyParser.json());

// Función para enviar mensajes
async function sendMessage(to, message) {
  console.log(`📤 Enviando mensaje a ${to}: ${message}`);
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
      text: { body: message }
    })
  });
}

// Endpoint para recibir notificaciones
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

      console.log("\n==============================");
      console.log("📩 NUEVO MENSAJE");
      console.log("==============================");
      console.log(`👤 Nombre: ${name}`);
      console.log(`📱 Número: ${from}`);
      console.log(`📝 Mensaje: ${text}`);
      console.log("------------------------------");

      // Campo abierto en la terminal para responder
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question("✍️ Escribe tu respuesta para este cliente: ", async (respuesta) => {
        await sendMessage(from, respuesta);
        rl.close();
      });
    }
  } catch (err) {
    console.error("❌ Error al procesar mensaje:", err);
  }

  res.sendStatus(200);
});

// Verificación del webhook
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
