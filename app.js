var express = require('express')
var app = express()
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
        resp.send(token)
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
      resp.send(nuevoObj)
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
      const tokenSent = req.headers['token'];
      let payload = user.payload
      let token = jwt.encode(payload, secret)
      if( token !== tokenSent ) {
        resp.status(401)
        resp.send("Unauthorized")
      } else {
        resp.status(200)
        resp.send({
          "id": userId,
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
      const tokenSent = req.headers['token'];
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
      resp.status(200)
      resp.send({
        "id": centerId,
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

app.post('/api/users/:idUser/centers', function(req, resp) {

  const userId = parseInt(req.params.idUser)
  knex.select().table('user').where('id', userId)
  .then( function(data) {
    if(data.length > 0) {
      let user = data[0]
      // **** AUTHORITHATION ****
      const tokenSent = req.headers['token'];
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
      const tokenSent = req.headers['token'];
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
      const tokenSent = req.headers['token'];
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

app.get('/api/centers/:id/animals', function(req, resp) {

  const centerId = parseInt(req.params.id)

  knex.select().table('center').where('id', centerId)
  .then( function(center) {
    if(center.length > 0) {
      knex.select().table('animal').where('center_id', centerId)
      .then( function(data) {
        var array = []

        data.forEach(function(element) {
          array.push(element)
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
          resp.status(201)
          resp.header('Location', 'http://localhost:3000/api/centers/' + centerId + '/animals/' + data[0].id)
          resp.send({
            "id": data[0].id,
            "center_id": centerId,
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
      const tokenSent = req.headers['token'];
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
      const tokenSent = req.headers['token'];
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

app.listen(app.get('port'), function () {
    console.log("Servidor arrancado");
});

module.exports = app;
