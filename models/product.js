const { name } = require('ejs');
const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
    name : String,
    price : Number,
    imageUrl : String,
});

module.exports = mongoose.model('Product', productSchema);