const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exercise-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
})

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }
    
    const user = new User({ username })
    await user.save()
    
    res.json({
      username: user.username,
      _id: user._id
    })
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Username already exists' })
    } else {
      res.status(500).json({ error: 'Server error' })
    }
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id')
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params
    const { description, duration, date } = req.body
    
    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' })
    }
    
    const user = await User.findById(_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    const exerciseDate = date ? new Date(date) : new Date()
    const exercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    })
    
    await exercise.save()
    
    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params
    const { from, to, limit } = req.query
    
    const user = await User.findById(_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    let query = { userId: _id }
    
    if (from || to) {
      query.date = {}
      if (from) {
        query.date.$gte = new Date(from)
      }
      if (to) {
        query.date.$lte = new Date(to)
      }
    }
    
    let exercises = await Exercise.find(query)
      .select('description duration date')
      .sort({ date: -1 })
      .limit(limit ? parseInt(limit) : 0)
    
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }))
    
    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log
    })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})