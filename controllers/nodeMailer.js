require('dotenv').config()
const nodeMailer =  require('nodemailer');


const transporter = nodeMailer.createTransport({
    service: 'gmail',
    secure: false,
    port: 3000,
    auth: {
        user: process.env.email,
        pass: process.env.password
    },
    tls: {
        rejectUnauthorized: false
    }
});

const MailOptions = {
    from: process.env.email,
    to: process.env.email,
    subject: 'Sending an email with nodemailer',
    text: 'Everything is working fine',
    html: "<b>Good work !</b>"
};

transporter.sendMail(MailOptions, function(error, info){
    if(error) {
        console.log(error);   
    } else {
        console.log('Email sent' + info.response);
        
    }
});



module.exports = nodeMailer;