const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');

// Route d'inscription
router.get('/signup', (req, res) => {
  res.render('signup');
});

router.post('/signup', async (req, res) => {
  try {
    const existUser = await User.findOne({ username: req.body.username });
    if (existUser) {
      return res.render("signup", { errorMessage: "Ce nom d'utilisateur est déjà pris." });
    }

    const newUser = new User({ username: req.body.username });
    User.register(newUser, req.body.password, function(err, user) {
      if (err) {
        return res.render('signup', { errorMessage: "Erreur lors de l'enregistrement." });
      }
      passport.authenticate('local')(req, res, function() {
        res.redirect('/auth/login');
      });
    });
  } catch (error) {
    return res.render('signup', { errorMessage: "Une erreur s'est produite." });
  }
});

// Route de connexion
router.get('/login', (req, res) => {
  res.render('login');
});


router.post('/login', (req, res, next) => {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/auth/login'); }

    req.login(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/home');
    });
  })(req, res, next);
});

// Route de déconnexion
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/auth/login');
  });
});

module.exports = router;
