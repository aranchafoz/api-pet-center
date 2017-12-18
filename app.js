var express = require('express')
var app = express()
// Soporte de CORS al servidor del API
var cors = require('cors')
app.use(cors())

// Para el post
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Autentificación
var jwt = require('jwt-simple');
var payload = { foo: 'bar' };
var secret = 'xxx';

// DATABASE
var knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: "database.db"
    },
    useNullAsDefault: true
});

// Para Heroku
app.set('port', (process.env.PORT || 3000));
// Heroku link:
// (p.e.) https://limitless-retreat-78745.herokuapp.com/api/centers

// Base de datos
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('database.db')

function initDatabase() {
  db.serialize(function() {
    db.run('CREATE TABLE IF NOT EXISTS user(id  INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, password TEXT NOT NULL, payload TEXT NOT NULL);')
    db.run('CREATE TABLE IF NOT EXISTS center(id  INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,city TEXT NOT NULL,cp INTEGER NOT NULL,phone INTEGER NOT NULL,max_capacity  INTEGER NOT NULL,user_id INTEGER,FOREIGN KEY(user_id) REFERENCES User(id) ON DELETE CASCADE);')
    db.run('CREATE TABLE IF NOT EXISTS animal(id  INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,type TEXT NOT NULL,age INTEGER NOT NULL,center_id INTEGER,user_id INTEGER,FOREIGN KEY(center_id) REFERENCES Center(id) ON DELETE CASCADE,FOREIGN KEY(user_id) REFERENCES User(id) ON DELETE CASCADE);')
  })

/*  db.run('DELETE FROM user WHERE id > 0')
  db.run(`DELETE FROM sqlite_sequence WHERE name = 'user'`);
  db.run('DELETE FROM center WHERE id > 0')
  db.run(`DELETE FROM sqlite_sequence WHERE name = 'center'`);
  db.run('DELETE FROM animal WHERE id > 0')
  db.run(`DELETE FROM sqlite_sequence WHERE name = 'animal'`);*/
}


// ********************
// **** Endpoints *****
// ********************

app.get('/', function(req, resp) {
  resp.status(200)
  resp.end()
})

// ****** USERS *********

app.post('/login', function(req, resp) {
  var obj = req.body
  if(obj.username && obj.password) {
    let user = {
      name: obj.username,
      password: obj.password
    }
    knex.select().table('user').where(user)
    .then( function(data) {
      if(data.length > 0) {
        var token = jwt.encode(data[0].payload, secret)

        resp.status(201)
        resp.send({id: data[0].id, token: token})
        resp.end()
      } else {
        resp.status(404)
        resp.send({error: "No existe ese usuario", user: user})
        resp.end()
      }
    })
    .catch(function(error) {
      resp.status(404)
      resp.send({error: "No existe ese usuario", user: user})
      resp.end()
    });
  }
  else {
    resp.status(400)
    resp.send({error: "Faltan parametros", body: req.body})
    resp.end()
  }
})

app.post('/register', function(req, resp) {
  var obj = req.body
  if(obj.username && obj.password) {
    let payload = 'bar'.concat((obj.password).concat(obj.username))
    let nuevoObj = {
      name: obj.username,
      password: obj.password,
      payload: JSON.stringify({
        foo: payload,
      }),
    }
    var token = jwt.encode(nuevoObj.payload, secret)

    knex('user').insert(nuevoObj)
    .then(function (row) {
      resp.status(201)
      resp.header('Location', 'http://localhost:3000/api/users' + row)
      resp.send({id: row[0], token: token})
      resp.end()
    })
    .catch(function(error) {
      resp.status(400)
      resp.send({error: "Se ha producido un error durante el insert", description: error, body: req.body})
      resp.end()
    });
  }
  else {
    resp.status(400)
    resp.send({error: "Faltan parametros", body: req.body})
    resp.end()
  }
})

app.get('/api/users', function(req, resp) {

  knex.select().table('user')
  .then( function(data) {
    resp.status(200)

    var array = []

    data.forEach(function(element) {
      array.push(element)
    })

    resp.send(array)
  })
})

app.get('/api/users/:id', function(req, resp) {

  const userId = parseInt(req.params.id)

  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['authorization'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
      } else {
        resp.status(200)
        resp.send({
          "id": userId,
          "name": user.name,
          "_links": {
            "self": {
               "href": 'http://localhost:3000/api/users/' + userId
            },
            "users": {
              "href": 'http://localhost:3000/api/users'
            },
            "centers": {
              "href": 'http://localhost:3000/api/centers'
            }
          }
        })
      }
      // **** END ****
      resp.end()
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario", id: userId})
    resp.end()
  });
})

app.put('/api/users/:idUser/adopta/:idAnimal', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  const animalId = parseInt(req.params.idAnimal)

  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['authorization'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
        resp.end()
      }
      // **** END ****
      else {
        knex.select().table('animal').where('id', animalId)
        .then( function(data) {
          if(data.length > 0) {
            let animal = data[0]
            knex('animal')
            .where('id', '=', animalId)
            .update({
              center_id: null,
              user_id: userId
            }).then( function(data) {
              resp.status(200)
              resp.send({
                "idAnimal": animalId,
                "idUser": userId,
                "_links": {
                  "self": {
                     "href": 'http://localhost:3000/api/users/' + userId
                  },
                  "users": {
                    "href": 'http://localhost:3000/api/users'
                  },
                  "centers": {
                    "href": 'http://localhost:3000/api/centers'
                  }
                }
              })
              resp.end()
            })
          } else {
            resp.status(404)
            resp.send({error: "No existe ese animal", id: animalId})
            resp.end()
          }
        })
        .catch(function(error) {
          resp.status(404)
          resp.send({error: "No existe ese animal", id: animalId})
          resp.end()
        });
      }
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario", id: userId})
    resp.end()
  });
})

// ****** CENTERS *********

app.get('/api/centers', function(req, resp) {

  knex.select().table('center')
  .then( function(data) {
    resp.status(200)

    var array = []

    data.forEach(function(element) {
      array.push(element)
    })

    resp.send(array)
  })
})

app.get('/api/centers/:id', function(req, resp) {

  const centerId = parseInt(req.params.id)

  knex.select().table('center').where('id', centerId)
  .then( function(data) {
    if(data.length > 0) {
      let center = data[0]
      resp.status(200)
      resp.send({
        "id": centerId,
        "name": center.name,
        "city": center.city,
        "cp": center.cp,
        "phone": center.phone,
        "max_capacity": center.max_capacity,
        "user_id": center.user_id,
        "_links": {
          "self": {
             "href": 'http://localhost:3000/api/centers/' + centerId
          },
          "centers": {
            "href": 'http://localhost:3000/api/centers'
          },
          "animals": {
            "href": 'http://localhost:3000/api/centers/' + centerId + '/animals'
          }
        }
      })
      resp.end()
    } else {
      resp.status(404)
      resp.send({error: "No existe ese centro", id: centerId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese centro", id: centerId})
    resp.end()
  });
})

app.get('/api/users/:idUser/centers', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['authorization'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
        resp.end()
      }
      // **** END ****
      else {
        knex.select().table('center').where('user_id', userId)
        .then( function(data) {
          var array = []

          data.forEach(function(element) {
            array.push({
              id: element.id,
              name: element.name,
              city: element.city,
              cp: element.cp,
              phone: element.phone,
              max_capacity: element.max_capacity,
              user_id: element.user_id
            })
          })

          if(array.length !== 0){
            resp.status(200)
            resp.send(array)
            resp.end()
          } else {
            resp.status(404)
            resp.send({error: "No se han registrado centros de este usuario"})
            resp.end()
          }
        });
      }
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario madafaka", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario pitu", id: userId})
    resp.end()
  });
})

app.post('/api/users/:idUser/centers', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['authorization'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
        resp.end()
      }
      // **** END ****
      else {
        var obj = req.body
        if(obj.name && obj.city && obj.cp && obj.phone && obj.maxCapacity) {

          var nuevoObj = {
            name: obj.name,
            city: obj.city,
            cp: obj.cp,
            phone: obj.phone,
            max_capacity: obj.maxCapacity,
            user_id: userId,
          }

          knex('center').insert(nuevoObj)
          .then(function (row) {
            resp.status(201)
            resp.header('Location', 'http://localhost:3000/api/centers' + row)
            resp.send({
              "id": row,
              "_links": {
                "self": {
                   "href": 'http://localhost:3000/api/centers/' + row
                },
                "centers": {
                  "href": 'http://localhost:3000/api/centers'
                },
                "animals": {
                  "href": 'http://localhost:3000/api/centers/' + row + '/animals'
                }
              }
            })
            resp.end()
          })
          .catch(function(error) {
            resp.status(400)
            resp.send({error: "Se ha producido un error durante el insert", body: req.body})
            resp.end()
          });
        }
        else {
          resp.status(400)
          resp.send({error: "Faltan parametros", body: req.body})
          resp.end()
        }
      }
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario", id: userId})
    resp.end()
  });
})

app.put('/api/users/:idUser/centers/:idCenter', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  const centerId = parseInt(req.params.idCenter)

  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['authorization'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
        resp.end()
      }
      // **** END ****
      else {
          knex.select().table('center').where({id: centerId, user_id: userId})
          .then( function(data) {
            if(data.length > 0) {
              var obj = req.body
              if(obj.name && obj.city && obj.cp && obj.phone && obj.maxCapacity) {
                var nuevoObj = {
                  name: obj.name,
                  city: obj.city,
                  cp: obj.cp,
                  phone: obj.phone,
                  max_capacity: obj.maxCapacity,
                }
                knex('center')
                .where('id', '=', centerId)
                .update(nuevoObj).then( function(data) {
                  resp.status(200)
                  resp.header('Location', 'http://localhost:3000/api/centers/' + data )
                  resp.send({
                    "id": data,
                    "_links": {
                      "self": {
                         "href": 'http://localhost:3000/api/centers/' + data
                      },
                      "centers": {
                        "href": 'http://localhost:3000/api/centers'
                      },
                      "animals": {
                        "href": 'http://localhost:3000/api/centers/' + data + '/animals'
                      }
                    }
                  })
                  resp.end()
                })
              } else {
                resp.status(400)
                resp.send({error: "Faltan parametros", body: req.body})
                resp.end()
              }
            } else {
              resp.status(404)
              resp.send({error: "No existe ese centro", id: centerId})
              resp.end()
            }
          })
          .catch(function(error) {
            resp.status(404)
            resp.send({error: "No existe ese centro o no es de tu propiedad", id: centerId})
            resp.end()
          });
        }
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario", id: userId})
    resp.end()
  });
})

app.delete('/api/users/:idUser/centers/:idCenter', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  const centerId = parseInt(req.params.idCenter)

  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['authorization'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
        resp.end()
      }
      // **** END ****
      else {
        knex.select().table('center').where({ id: centerId, user_id: userId })
        .then( function(data) {
          if(data.length > 0) {
            knex('center')
            .where('id', centerId)
            .del().then(function(data) {
              resp.status(200)
              resp.end()
            })
          } else {
            resp.status(404)
            resp.send({error: "No existe ese centro", id: centerId})
            resp.end()
          }

        })
        .catch(function(error) {
          resp.status(404)
          resp.send({error: "No existe ese centro", id: centerId})
          resp.end()
        });
      }
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario", id: userId})
    resp.end()
  });
})

// ****** ANIMALS *********
app.get('/api/users/:id/animals', function(req, resp) {

  const userId = parseInt(req.params.id)
  let offset = parseInt(req.query.offset);

  knex.select().table('user').where('id', userId)
  .then( function(user) {
    if(user.length > 0) {
      knex.select().table('animal').where('user_id', userId)
      .limit(3).offset((offset - 1) * 3)
      .then( function(data) {
        var array = []

        data.forEach(function(element) {
          array.push({
            id: element.id,
            name: element.name,
            type: element.type,
            age: element.age,
            center_id: element.center_id,
            user_id: element.user_id,
            _links: {
              prev: {
                 href: 'http://localhost:3000/api/users/' + userId + '/animals?offset=' + (offset - 1)
              },
              next: {
                 href: 'http://localhost:3000/api/users/' + userId + '/animals?offset=' + (offset + 1)
              },
              user: {
                href: 'http://localhost:3000/api/users/' + userId
              }
            }
          })
        })

        if(array.length !== 0){
          resp.status(200)
          resp.send(array)
          resp.end()
        } else {
          resp.status(404)
          resp.send({error: "No se han registrado animales de este usuario"})
          resp.end()
        }
      });
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario", id: userId})
    resp.end()
  });
})

app.get('/api/centers/:id/animals', function(req, resp) {

  const centerId = parseInt(req.params.id)
  let offset = parseInt(req.query.offset);

  knex.select().table('center').where('id', centerId)
  .then( function(center) {
    if(center.length > 0) {
      knex.select().table('animal').where('center_id', centerId)
      .limit(3).offset((offset - 1) * 3)
      .then( function(data) {
        var array = []

        data.forEach(function(element) {
          array.push({
            id: element.id,
            name: element.name,
            type: element.type,
            age: element.age,
            center_id: element.center_id,
            user_id: element.user_id,
            _links: {
              self: {
                 href: 'http://localhost:3000/api/centers/' + centerId + '/animals/' + data[0].id
              },
              prev: {
                 href: 'http://localhost:3000/api/centers/' + centerId + '/animals?offset=' + (offset - 1)
              },
              next: {
                 href: 'http://localhost:3000/api/centers/' + centerId + '/animals?offset=' + (offset + 1)
              },
              center: {
                href: 'http://localhost:3000/api/centers' + centerId
              }
            }
          })
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
      });
    } else {
      resp.status(404)
      resp.send({error: "No existe ese centro", id: centerId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese centro", id: centerId})
    resp.end()
  });
})

app.get('/api/centers/:idCenter/animals/:idAnimal', function(req, resp) {

  const centerId = parseInt(req.params.idCenter)
  const animalId = parseInt(req.params.idAnimal)

  knex.select().table('center').where('id', centerId)
  .then( function(center) {
    if(center.length > 0) {
      knex.select().table('animal').where('id', animalId)
      .then( function(data) {
        if(data.length > 0) {
          let animal = data[0]
          resp.status(201)
          resp.header('Location', 'http://localhost:3000/api/centers/' + centerId + '/animals/' + data[0].id)
          resp.send({
            "id": data[0].id,
            "name": animal.name,
            "type": animal.type,
            "age": animal.age,
            "center_id": centerId,
            "user_id": animal.user_id,
            "_links": {
              "self": {
                 "href": 'http://localhost:3000/api/centers/' + centerId + '/animals/' + data[0].id
              },
              "centers": {
                "href": 'http://localhost:3000/api/centers'
              },
              "animals": {
                "href": 'http://localhost:3000/api/centers/' + centerId + '/animals'
              }
            }
          })
          resp.end()
        } else {
          resp.status(404)
          resp.send({error: "No existe ese animal", id: animalId})
          resp.end()
        }
      })
      .catch(function(error) {
        resp.status(404)
        resp.send({error: "No existe ese animal", id: animalId})
        resp.end()
      });
    } else {
      resp.status(404)
      resp.send({error: "No existe ese centro", id: centerId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese centro", id: centerId})
    resp.end()
  });
})

app.post('/api/users/:idUser/centers/:idCenter/animals', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  const centerId = parseInt(req.params.idCenter)

  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['authorization'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
        resp.end()
      }
      // **** END ****
      else {
        knex.select().table('center').where({id: centerId, user_id: userId})
        .then( function(center) {
          if(center.length > 0) {
            var obj = req.body
            if(obj.name && obj.type && obj.age) {
              var nuevoObj = {
                name: obj.name,
                type: obj.type,
                age: obj.age,
                center_id: centerId,
                user_id: null,
              }
              knex('animal').where('center_id', centerId).count('id as count')
              .then(function (data) {
                if(data.length <= 0) {
                  if(data[0].count >= center[0].max_capacity) {
                    resp.status(400)
                    resp.send({error: "Lo sentimos, el centro está lleno. Prueba con otro centro."})
                    resp.end()
                  }
                }
                knex('animal').insert(nuevoObj)
                .then(function (row) {
                  resp.status(201)
                  resp.header('Location', 'http://localhost:3000/api/centers/' + centerId + '/animals/' + row)
                  resp.send({
                    "id": row,
                    "center_id": centerId,
                    "_links": {
                      "self": {
                         "href": 'http://localhost:3000/api/centers/' + centerId + '/animals/' + row
                      },
                      "centers": {
                        "href": 'http://localhost:3000/api/centers'
                      },
                      "animals": {
                        "href": 'http://localhost:3000/api/centers/' + centerId + '/animals'
                      }
                    }
                  })
                  resp.end()
                })
                .catch(function(error) {
                  resp.status(400)
                  resp.send({error: "Se ha producido un error durante el insert", body: req.body})
                  resp.end()
                });
              })

            }
            else {
              resp.status(400)
              resp.send({error: "Faltan parametros"})
              resp.end()
            }
          } else {
            resp.status(404)
            resp.send({error: "No existe ese centro o no es de su propiedad", id: centerId})
            resp.end()
          }
        })
        .catch(function(error) {
          resp.status(404)
          resp.send({error: "No existe ese centro o no es de su propiedad", id: centerId})
          resp.end()
        });
      }
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario", id: userId})
    resp.end()
  });
})

app.delete('/api/users/:idUser/centers/:idCenter/animals/:idAnimal', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  const centerId = parseInt(req.params.idCenter)
  const animalId = parseInt(req.params.idAnimal)

  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['authorization'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
        resp.end()
      }
      // **** END ****
      else {
        knex.select().table('center').where({id: centerId, user_id: userId})
        .then( function(center) {
          if(center.length > 0) {
            knex.select().table('animal').where('id', animalId)
            .then( function(data) {
              if(data.length > 0) {
                knex('animal')
                .where('id', animalId)
                .del().then(function(data) {
                  resp.status(200)
                  resp.end()
                })
              } else {
                resp.status(404)
                resp.send({error: "No existe ese animal", id: animalId})
                resp.end()
              }
            })
            .catch(function(error) {
              resp.status(404)
              resp.send({error: "No existe ese animal", id: animalId})
              resp.end()
            });
          } else {
            resp.status(404)
            resp.send({error: "No existe ese centro o no es de su propiedad", id: centerId})
            resp.end()
          }
        })
        .catch(function(error) {
          resp.status(404)
          resp.send({error: "No existe ese centro o no es de su propiedad", id: centerId})
          resp.end()
        });
      }
    } else {
      resp.status(404)
      resp.send({error: "No existe ese usuario", id: userId})
      resp.end()
    }
  })
  .catch(function(error) {
    resp.status(404)
    resp.send({error: "No existe ese usuario", id: userId})
    resp.end()
  });
})

initDatabase();

app.listen(app.get('port'), function () {
    console.log("Servidor arrancado");
});

module.exports = app;
