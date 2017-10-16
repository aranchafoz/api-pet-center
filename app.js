var express = require('express')
var app = express()
const bodyParser = require('body-parser');
app.use(bodyParser.json());


let users = new Map();
users.set(1, {
    email: "pepe@gmail.com",
    password: "1234",
    centers: [],
    animals: [],
 })

let itCenter = 0
let centers = new Map();
// let itAnimal = 0
// let animals = new Map();


app.set('port', (process.env.PORT || 3000));

app.get('/', function(req, resp) {
  resp.status(200)
  resp.end()
})

// ****** USERS *********

app.get('/api/users', function(req, resp) {
  resp.status(200)

  var array = []

  users.forEach(function(element) {
    array.push(element)
  })

  resp.send(array)
})

app.get('/api/user/:id', function(req, resp) {

  const userId = parseInt(req.params.id)
  if(users.has(userId)) {
    resp.status(200)
    let user = users.get(userId)
    resp.send(user)
    resp.end()

  }
  else {
      resp.status(404)
      resp.send({error: "No existe este usuario", id: userId})
      resp.end()
  }
})

app.put('/api/user/:idUser/adopta/:idAnimal', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  if(users.has(userId)) {
    const animalId = parseInt(req.params.idAnimal)
    if(animals.has(animalId)) {
      resp.status(200)

      let user = users.get(userId)
      let userAnimals = user.animals

      let animal = animals.get(animalId)

      userAnimals.push(animal)
      user.animals = userAnimals
      users.set(userId, user)

      animal.centerId = null
      animal.ownerId = userId
      animals.set(animalId, animal)

      resp.send({user: user, animal: animal})
      resp.end()
    }
    else {
        resp.status(404)
        resp.send({error: "No existe este animal", id: userId})
        resp.end()
    }
  }
  else {
      resp.status(404)
      resp.send({error: "No existe este usuario", id: userId})
      resp.end()
  }
})

// ****** CENTERS *********

app.get('/api/centers', function(req, resp) {
  resp.status(200)

  var array = []

  centers.forEach(function(element) {
    array.push(element)
  })

  resp.send(array)
})

app.get('/api/center/:id', function(req, resp) {

  const centerId = parseInt(req.params.id)
  if(centers.has(centerId)) {
    resp.status(200)
    let center = centers.get(centerId)
    resp.send(center)
    resp.end()

  }
  else {
      resp.status(404)
      resp.send({error: "No existe ese centro", id: centerId})
      resp.end()
  }
})

app.post('/api/centers', function(req, resp) {
  var obj = req.body
  if(obj.name && obj.city && obj.cp && obj.phone && obj.maxCapacity) {
    itCenter++
    var nuevoObj = {
      name: obj.name,
      city: obj.city,
      cp: obj.cp,
      phone: obj.phone,
      maxCapacity: obj.maxCapacity,
      userId: null,
      animals: [],
    }
    centers.set(itCenter, nuevoObj)
    resp.status(201)
    resp.header('Location', 'http://localhost:3000/api/center' + nuevoObj.id)
    resp.send(nuevoObj)
    resp.end()
  }
  else {
    resp.status(400)
    resp.send({error: "Faltan parametros", body: req.body})
    resp.end()
  }
})

app.delete('/api/center/:id', function(req, resp) {

  const centerId = parseInt(req.params.id)
  if(centers.has(centerId)) {
    resp.status(200)
    centers.delete(centerId)
    resp.send(centers)
    resp.end()

  }
  else {
      resp.status(404)
      resp.send({error: "No existe ese centro", id: centerId})
      resp.end()
  }
})

// ****** ANIMALS *********

app.get('/api/center/:id/animals', function(req, resp) {

  const centerId = parseInt(req.params.id)
  if(centers.has(centerId)) {

    let array = []
    const center = centers.get(centerId)
    const centerAnimals = center.animals
    centerAnimals.forEach(function(element) {
      if(element.hasOwnProperty('centerId') && element.centerId === centerId){
        array.push(element)
      }
    })
    if(array.length !== 0){
      resp.status(200)
      resp.send(array)
      resp.end()
    } else {
      resp.status(404)
      resp.send({error: "No se han registrado animales en este centro"})
      resp.end()
    }
  }
  else {
      resp.status(404)
      resp.send({error: "No existe ese centro"})
      resp.end()
  }
})

app.get('/api/center/:idCenter/animal/:idAnimal', function(req, resp) {

  const centerId = parseInt(req.params.idCenter)
  if(centers.has(centerId)) {

    const center = centers.get(centerId)
    const centerAnimals = center.animals
    const animalId = parseInt(req.params.idAnimal)
    if(centerAnimals.has(animalId)) {

      resp.status(200)

      let animal = centerAnimals.get(animalId)
      resp.send(animal)
      resp.end()
    }
    else {
        resp.status(404)
        resp.send({error: "No existe ese animal"})
        resp.end()
    }
  }
  else {
      resp.status(404)
      resp.send({error: "No existe ese centro"})
      resp.end()
  }
})

app.post('/api/center/:id/animals', function(req, resp) {

  const centerId = parseInt(req.params.id)
  if(centers.has(centerId)) {

    var obj = req.body
    if(obj.name && obj.type && obj.age) {
      var nuevoObj = {
        name: obj.name,
        type: obj.type,
        age: obj.age,
        centerId: centerId,
        ownerId: null,
      }

      const center = centers.get(centerId)
      const centerAnimals = center.animals
      for(i = 0; i < center.maxCapacity; i++) {
        if(!centerAnimals.has(i) || centerAnimals.get(i) === null){
          centerAnimals.set(i, nuevoObj)
          break
        }
      }
      resp.status(201)
      resp.header('Location', 'http://localhost:3000/api/animal' + nuevoObj.id)
      resp.send(nuevoObj)
      resp.end()
    }
    else {
      resp.status(400)
      resp.send({error: "Faltan parametros"})
      resp.end()
    }
  }
  else {
      resp.status(404)
      resp.send({error: "No existe ese centro"})
      resp.end()
  }
})

app.delete('/api/center/:idCenter/animal/:idAnimal', function(req, resp) {


  const centerId = parseInt(req.params.idCenter)
  const animalId = parseInt(req.params.idAnimal)
  if(centers.has(centerId)) {

    const center = centers.get(centerId)
    const centerAnimals = center.animals

    if(centerAnimals.has(animalId)) {
      resp.status(200)

      centerAnimals.delete(animalId)
      center.animals = centerAnimals
      centers.set(centerId, center)

      resp.send(centers)
      resp.end()
    }
    else {
        resp.status(404)
        resp.send({error: "No existe ese animal", id: animalId})
        resp.end()
    }
  }
  else {
      resp.status(404)
      resp.send({error: "No existe ese centro", id: centerId})
      resp.end()
  }
})

app.listen(app.get('port'), function () {
    console.log("Servidor arrancado");
});

module.exports = app;
