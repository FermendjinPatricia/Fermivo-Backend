const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // pune cheia secretă din Stripe Dashboard
const User = require('../models/User'); // presupun că ai deja modelul User.js

// Creează sesiunea Stripe Checkout
router.post('/create-checkout-session', async (req, res) => {
  const { userId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_1RVqCARoKj519u0dZdGRjT64', // ID-ul de preț real
        quantity: 1
      }],
      mode: 'subscription',
      success_url: 'http://localhost:8080/premium-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:8080/premium',
      metadata: {
        userId: userId
      }
    });

    res.json({ url: session.url }); // trimite URL-ul de checkout la frontend
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la crearea sesiunii de plată' });
  }
});

// Stripe webhook - activează cont premium după plată
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, 'whsec_...'); // pune secretul de webhook real
  } catch (err) {
    console.error(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    // Activează contul premium
    User.findByIdAndUpdate(userId, { isPremium: true }, (err, user) => {
      if (err) console.error(err);
      console.log(`✅ Cont premium activat pentru user: ${userId}`);
    });
  }

  res.json({ received: true });
});

module.exports = router;
