import express from 'express';

const app = express();

app.get('/sum/:a/:b', (req, res) => {
    console.log(req.params);
    res.send(req.params)

});

app.listen(3000, () => {
    console.log("server is listening");
});

export default app;