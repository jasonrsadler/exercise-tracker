const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
var Schema = mongoose.Schema;
var userSchema = new Schema({
  userName: String
})
var userModel = mongoose.model('User', userSchema)
var exerciseSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  date: Date
})
var exerciseModel = mongoose.model('Excercise', exerciseSchema)
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  userModel.findOne({ userName: req.body.username }, (err, result) => {
    if (!result) {
      userModel.create({ userName: req.body.username }, (err, result) => {
        if (err) return err
        res.json({ userName: result.userName, id: result._id })
        return
      })
    } else {
      res.json({ error: 'User already exists' })
    }
  })
})

app.get('/api/exercise/users', (req, res) => {
  userModel.find((err, result) => {
    if (err) return err
    res.json({ users: result.map(res => { return { userName: res.userName, id: res._id } }) })
  })
})

app.get('/api/exercise/log', (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
    res.json({ error: 'Id type is not valid' })
    return
  }
  userModel.findOne({ _id: req.query.userId }, (err, result) => {
    if (err) {
      res.json({ error: 'Error when trying to fetch user' })
      return
    }
    if (!result) {
      res.json({ error: 'User does not exist' })
      return
    } else {
      let fromDate
      let toDate
      if (req.query.fromDate) {
        let fromDateQuery = req.query.fromDate.split('-')
        if (fromDateQuery.length !== 3) {
          fromDateQuery = new Date('01-01-1970')
          fromDate = fromDateQuery
        } else {
          fromDate = new Date(fromDateQuery[0], fromDateQuery[1] - 1, fromDateQuery[2])
        }
      } else {
        fromDate = new Date('01-01-1970')
      }

      if (req.query.toDate) {
        let toDateQuery = req.query.toDate.split('-')
        if (toDateQuery.length !== 3) {
          toDateQuery = new Date(8640000000000000)
          toDate = toDateQuery
        } else {
          toDate = new Date(toDateQuery[0], toDateQuery[1] - 1, toDateQuery[2])
        }
      } else {
        toDate = new Date(8640000000000000)
      }

      exerciseModel.find({
        userId: req.query.userId,
        $and: [
          {
            date: {
              $gte: fromDate
            }
          },
          {
            date: {
              $lte: toDate
            }
          }
        ]
      }, null, (err, exerciseResult) => {
        if (err) {
          res.json('Error: ' + err)
          return
        }
        if (!exerciseResult) {
          res.json('No excercise results')
          return
        } else {
          res.json({ user: result, log: exerciseResult, log_count: exerciseResult.length })
        }
      }).limit(Number(req.query.limit) || 0)
    }
  })
})

app.post('/api/exercise/add', (req, res) => {
  userModel.findOne({ _id: req.body.userId }, (err, result) => {
    if (err) {
      res.json({ error: 'Error when trying to fetch user' })
      return
    }
    if (!result) {
      res.json({ error: 'User does not exist' })
      return
    } else {
      let date = new Date()
      date.setHours(0, 0, 0, 0)
      if (req.body.date) {
        let strDate = req.body.date.split('-')
        strRequestDate = new Date(strDate[0], strDate[1] - 1, strDate[2])
        strRequestDate.setHours(0, 0, 0, 0)
        date = strRequestDate
      }
      exerciseModel.create({
        userId: req.body.userId,
        description: req.body.description,
        duration: req.body.duration,
        date: date
      }, (err, excerciseResult) => {
        if (err) {
          res.json({ error: 'An error occurred: ' + err })
          return
        } else {
          res.json({
            user: result,
            userId: excerciseResult.userId,
            description: excerciseResult.description,
            duration: excerciseResult.duration,
            date: excerciseResult.date || ''
          })
        }
      })
    }
  })
})


// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})