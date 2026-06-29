const express = require('express');
const { google } = require('googleapis');
const usuarios =  {};

const app = express();
app.use(express.json());

// 🔐 PEGA CREDENCIAL SEGURA DO RENDER
const key = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({
  version: 'v3',
  auth,
});

// 🔥 VALIDAR ASSINATURA
app.post('/validar', async (req, res) => {
  try {
    const { packageName, subscriptionId, purchaseToken, email } = req.body;

    if (!email) {
      return res.status(400).json({ erro: 'Email não informado' });
    }

    const response = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    const status = response.data.paymentState;

    if (status === 1) {
      // 🔥 SALVA USUÁRIO COMO PREMIUM
      usuarios[email] = true;

      console.log(✅ Usuário ${email} ativado como premium);

      return res.json({ ativo: true });
    } else {
      console.log(❌ Assinatura inválida para ${email});

      return res.json({ ativo: false });
    }

  } catch (error) {
    console.error("Erro na validação:", error);

    return res.status(500).json({
      erro: 'Erro ao validar assinatura',
      detalhe: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(Servidor rodando na porta ${PORT});
});