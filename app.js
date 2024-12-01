const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const passportLocal = require('passport-local');
const bodyParser = require('body-parser');
const session = require('express-session')
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const PORT = 3000;
const app = express();
dotenv.config();
const URL = "mongodb://localhost:27017/userCollection";
const User = require('./models/user');
const Reset = require('./models/reset');
const Product = require('./models/product');

const randToken = require('rand-token');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
    session({
      secret: "keyboard cat",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
);

app.use(passport.session());
app.use(passport.initialize());
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => {
    res.locals.currentUser = req.user;  // req.user contient l'utilisateur connecté
    res.locals.isAuthenticated = req.isAuthenticated();  // Vérifie si l'utilisateur est authentifié
    next();
});



mongoose.connect(URL).then(function(){
    console.log('Le serveur est connecté à la base de données');
}).catch(function(err){
    console.log("Le serveur n'a pas pu se connecté voici l'erreur "+ err);
});

app.get('/', function(req, res){res.render('login');});
app.get('/home', isLoggedIn, function(req, res){res.render('home');});
app.get('/signup', function(req, res){res.render('signup');});
app.get('/login', function(req, res){res.render('login');});
app.get('/forgot', function(req, res){res.render('forgot');});
app.get('/add', isLoggedIn, function(req, res){
    const successMessage = req.session.successMessage;
    const errorMessage = req.session.errorMessage;
    res.render('add', { successMessage, errorMessage,});
});
app.get('/dashboard', isLoggedIn, function(req, res){res.render('dashboard')});
app.get('/logout', isLoggedIn, function(req, res, next){
req.logout(function(err) {
    if (err) {
        return next(err); 
    }
    res.redirect('login');
    });
    console.log('Vous etes déconnecté');
});

app.post('/signup', async function(req, res) {
    try {
        const existUser = await User.findOne({ username: req.body.username });

        if (existUser) {
            console.log("Utilisateur déjà existant : ", req.body.username);
            return res.render("signup", { errorMessage: "Ce nom d'utilisateur est déjà pris." });
        }

        const newUser = new User({ username: req.body.username });
        
        User.register(newUser, req.body.password, function(err, user) {
            if (err) {
                console.log("Erreur d'inscription : ", err);
                return res.render('signup', { errorMessage: "Erreur lors de l'enregistrement." });
            }
            passport.authenticate('local')(req, res, function() {
                console.log("Utilisateur créé avec succès : ", user.username);
                res.redirect('login');
            });
        });

    } catch (error) {
        console.log("Erreur générale : ", error);
        return res.render('signup', { errorMessage: "Une erreur s'est produite." });
    }
});


app.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            console.log('Inscrivez-vous avant');
            return res.redirect('login'); 
        }

        req.login(user, function(err) {
            if (err) {
                return next(err);
            }
            console.log("Connexion réussie");
            return res.redirect('home');
        });
    })(req, res, next); 
});

app.post('/forgot', async function(req, res) {
    try {
        const userFound = await User.findOne({ username: req.body.username });

        if (!userFound) {
            console.log("Utilisateur non trouvé pour réinitialisation : ", req.body.username);
            return res.render('forgot', { errorMessage: "Nom d'utilisateur introuvable." });
        }

        const token = randToken.generate(16);
        console.log("Token généré : ", token);

        await Reset.create({
            username: userFound.username,
            resetPasswordToken: token,
            resetPasswordExpired: Date.now() + 3600000  // Le token expire dans 1 heure
        });
        const transporter = nodemailer.createTransport({
            service : 'gmail',
            auth : {
                user: 'afroots2004@gmail.com',
                password : '090820040050'
            }
        });
        //Les mails options 
        const mailOptions = {
            form : 'afroots2004@gmail.com',
            to : req.body.username,
            subject : 'Link to reset your password',
            text : 'click on this link : http://localhost:3000/reset/' + token 

        }
        console.log('Mail est pret a etre envoyé');
        transporter.sendMail(mailOptions, function(err, response){
            if(err){
                console.log(err);
            }
            else{
                res.redirect('login');
            }
        });
        return res.render('forgot', { successMessage: "Un email avec un lien de réinitialisation a été envoyé." });

    } catch (error) {
        console.log("Erreur lors de la réinitialisation du mot de passe : ", error);
        return res.render('forgot', { errorMessage: "Une erreur s'est produite." });
    }
});

app.get('/reset/:token', function(req, res){
    Reset.findOne({
        resetPasswordToken : req.params.token,
        resetPasswordExpired : {
            $gt : Date.now()
        },function (err, obj) {
            if(err){
                console.log('token est fini');
                res.redirect('login');
            }else{
                res.render('reset',{
                    token: req.params.token
                });
            }
        }
    });
});
app.post('/reset/:token', function(req, res){
    Reset.findOne({
        resetPasswordToken : req.params.token,
        resetPasswordExpired : {
            $gt : Date.now()
        },function (err, obj) {
            if(err){
                console.log('token est fini');
                res.redirect('login');
            }else{
                if(req.body.password === req.body.password2){
                    User.findOne({
                        username : obj.username
                    },function(err,user){
                        if(err){
                            console.log(err);
                        }else{
                            user.setPassword(req.body.password, function(err){
                                if(err){
                                    console.log(err);
                                }else{
                                    User.save(function(err){
                                        if(err){
                                            console.log('Error ', err);
                                        }else{
                                            console.log('Mot de passe changé');
                                        }
                                    });
                                    const uptadeReset = {
                                        resetPasswordToken : null,
                                        resetPasswordExpired : null
                                    }
                                    Reset.findOneAndUpdate({
                                        resetPasswordToken : req.params.token
                                    },uptadeReset,function(err,obj1){
                                        if(err){
                                            console.log(err);
                                        }else{
                                            res.redirect('login');
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        }
    });
});
app.post('/add', async function(req, res){
    try{
        const productExist = await Product.findOne({
            name: req.body.name
        });
        if(productExist){
            req.session.errorMessage = "Product name already exists in the database";
            res.redirect('add');
        }else{
            const newProduct = new Product({
                name : req.body.name,
                price : req.body.price,
                imageUrl : req.body.imageUrl
            });
            newProduct.save().then(function(){
                req.session.successMessage = "Product inserted successfully";
                res.redirect('add');
                console.log('Product Insert');
            }).catch(function(err){
                console.log('Error on insert section',err);
            });
        }

    }catch(error){
        console.log('error', error);
    }
});
app.get('/all-product', isLoggedIn, async function(req, res) {
    try {
        const products = await Product.find();
        
        res.render('all-product', { 
            products: products,
            deleteSuccesMessage: req.session.deleteSuccesMessage,
            deleteErroMessage: req.session.deleteErroMessage
        });

        delete req.session.deleteSuccesMessage;
        delete req.session.deleteErroMessage;
    } catch (error) {
        console.log('Erreur', error);
    }
});
app.get('/client', isLoggedIn, async function(req, res){
    try{
        const client = await User.find();
        res.render('client', {client:client});
    }catch(error){
        console.log('error', error);
    }
});


app.post('/delete-product/:id', async function(req, res) {
    try {
        const productId = req.params.id;
        
        await Product.findByIdAndDelete(productId);
        
        req.session.deleteSuccesMessage = "Product deleted successfully";
        res.redirect('/all-product');
    } catch (err) {
        console.log('Erreur', err);
        
        req.session.deleteErroMessage = "Error deleting the product";
        res.redirect('/all-product');
    }
});


app.get('/update/:id', isLoggedIn, async function(req, res) {
    try {
        const productId = req.params.id; 
        console.log("ID du produit:", productId); 

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send('Produit non trouvé');
        }

        res.render('update', { product: product });

    } catch (error) {
        console.log('Erreur lors de la récupération du produit:', error);
        res.status(500).send('Erreur du serveur');
    }
});




app.post('/update-product/:id', async function (req, res) {
    try {
        const productId = req.params.id;
        const { name, price, imageUrl } = req.body; 

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { name, price, imageUrl },
            { new: true }               
        );

        if (!updatedProduct) {
            return res.status(404).send('Produit non trouvé');
        }

        // Redirige vers la page de mise à jour du produit pour afficher les nouvelles données
        res.redirect(`/update/${updatedProduct._id}`);

    } catch (error) {
        console.log('Erreur lors de la mise à jour du produit:', error);
        res.status(500).send('Erreur du serveur');
    }
});











function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {  
        return next();  
    } else {
        res.redirect('login');
    }
}

app.listen(PORT, function(){
    console.log(`Le serveur marche sur le port : ${PORT}`);
});