/**
 * Entrée Express minimale pour Vercel Services.
 * Fichier volontairement petit : le gros mono-bundle est ignoré (warning taille).
 * Les deps viennent de includeFiles (node_modules + dist).
 */
require('express'); // détection @vercel/express
require('dotenv').config();

const mod = require('./dist/index.js');
module.exports = mod.default || mod;
