const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const SubjectSchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref:'user'},
    title: {type: String},
    description: {type: String},
    choice: [{type: String}],
    yesPercentage:{type: Object},
    noPercentage:{type: Object}
});
const subject = mongoose.model('subject', SubjectSchema);
module.exports = subject;