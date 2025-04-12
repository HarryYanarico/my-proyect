 
const app = require('./src/app');
const PORT = process.env.PORT || 3000;
const host = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('¡El servidor funciona!');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en ${host}:${PORT}`);
});
