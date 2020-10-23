const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const rateLimit = require("express-rate-limit");
const Subject = require('../models/subjectModel');
const User = require('../models/userModel')

router.get('/', function (req, res) {
    Subject.find({})
        .select('-__v')
        .populate({ path: 'userId', populate: { path: 'subjects' }, model: 'user', select: '-__v' })
        .exec(function (error, surveys) {
            res.send({
                count: surveys.length,
                surveys: surveys
            })
        });
});

//____________________________Get single Expert __________________________

router.get('/:id', function (req, res) {
    // console.log('GET request');
    id = req.params.id;
    Subject.findOne({ _id: id })
      .select(' -__v')
      // .populate('specialty', {'_id ': 0})
    //   .populate({ path: 'userId', model: 'user', select: '-__v' })
      .exec(function (err, subject) {
        if (subject) {
            // console.log('subject => ',subject);
          res.status(200).send({
            id: subject._id,
            title: subject.title,
            description: subject.description,
            choices: subject.choices,
            yesPercentage: subject.yesPercentage,
            noPercentage: subject.noPercentage
          });
        } else {
          res.json({ message: `No subject found with id : ${id}` })
        //   console.log('bad');
        }
      });
  });

router.post('', function (req, res) {
    Subject.create(req.body).then(async function (subject) {
        //console.log(subject)
        let user = await User.findById(subject.userId)
        // console.log("'id => ", user.subjects);
        user.subjects.push(subject._id)
        await user.save()
        subject.yesPercentage = 0
        subject.noPercentage = 0
        subject.save()
        res.send({
            msg: 'survey created successfully !',
            subject: subject
        })
    })
})


const limiter = rateLimit({
    windowMs: 1000 * 60 * 60 * 24,  // 24 hours,
    max: 5, // number of requests 
    message: {
        status: 429,
        error: 'You are doing that too much.'
    }
})



router.put('/:id', limiter, function (req, res) {
    var totalChoices = 0, noChoices = 0, yesChoices = 0, yesPercentage = 0, noPercentage = 0
    Subject.findByIdAndUpdate({ _id: req.params.id }, req.body.choice).then(async function (subject) {
        let user = await User.findById(subject.userId)
        // console.log('this: ', user._id);
        subject.choice.push(req.body.choice)
        console.log(subject.choice);
        totalChoices = subject.choice.length
        if (yesChoices !== 0) {
            yesChoices = 0
        }
        for (let i = 0; i < totalChoices; i++) {
            if (subject.choice[i] == 'yes') {
                yesChoices ++
                console.log('yes => ',yesChoices);
            }
            if (subject.choice[i] == 'no') {
                noChoices ++
                console.log('no => ',noChoices);
            }
        }
        yesPercentage = (yesChoices / totalChoices) *100
        noPercentage = (noChoices / totalChoices) *100
        subject.yesPercentage = yesPercentage
        subject.noPercentage = noPercentage
        // console.log(subject);
        // console.log(yesPercentage, noPercentage);
        console.log('ip address => ', req.ip)
        
        subject.save();
        res.send(subject)
    });
});



router.delete('/:id', function (req, res) {
    Subject.findByIdAndDelete({ _id: req.params.id }, req.body).then(function (subject) {
        res.send(subject);
    });
});

module.exports = router