exports.setupRouting = (app) => {
  app.get('/home', getHome);
};

async function getHome(req, res) {
  res.json([]);
}
