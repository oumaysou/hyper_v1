const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');

const {
    validateRegisterInput,
    validateLoginInput,
    validateEditInput,
    validatePasswordsInput
} = require('../../util/validators');
const { SECRET_KEY } = require('../../config');
const User = require('../../models/User');
const nodemailer = require("nodemailer");

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            username: user.username
        },
        SECRET_KEY,
        { expiresIn: '3h' }
    );
}

module.exports = {
    Query: {
        async getUsers() {
            try {
                const users = await User.find().sort({ createdAt: -1 });
                return users;
            } catch (err) {
                throw new Error(err);
            }
        },
        async getUser(_, { userId }) {
            try {
                const user = await User.findById(userId);
                if (user) {
                    return user;
                } else {
                    throw new Error('User not found');
                }
            } catch (err) {
                throw new Error(err);
            }
        }
    },
    Mutation: {
        async login(_, { username, password }, context) {
            const { errors, valid } = validateLoginInput(username, password);

            if (!valid) {
                throw new UserInputError('Errors', { errors });
            }
            // console.log(username);
            // console.log(password);

            const user = await User.findOne({ username });
            if (!user) {
                errors.username = "Sorry, we can't find an account with this username. Please try again.";
                throw new UserInputError('User not found', { errors });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                errors.password = 'Wrong password';
                throw new UserInputError('Wrong crendetials', { errors });
            }

            const isVerified = await user.isVerified;
            if (isVerified === true) {
                errors.password = 'Your account has not been verified.';
                throw new UserInputError('Not been verified', { errors });
            }

            const token = generateToken(user);

            return {
                ...user._doc,
                id: user._id,
                token,
            };
        },
        async register(
            _,
            { registerInput: { username, prenom, nom, email, password, confirmPassword, image } }
        ) {
            // Validate user data
            // console.log("Holaaaa");
            // console.log({username});

            // console.log({image});
            
            const { valid, errors } = validateRegisterInput(
                username,
                prenom,
                nom,
                email,
                password,
                confirmPassword,
                image
            );
            if (!valid) {
                throw new UserInputError('Errors', { errors });
            }

            // TODO: Make sure user doesnt already exist
            const user = await User.findOne({ username, email });
            if (user) {
                throw new UserInputError('Username is taken', {
                    errors: {
                        username: 'This username is taken',
                        email: "This Email is taken"
                    }
                });
            }
            // hash password and create an auth token
            password = await bcrypt.hash(password, 12);
            const facebookId = "null";

            const newUser = new User({
                facebookId,
                email,
                username,
                prenom,
                nom,
                password,
                createdAt: new Date().toISOString(),
                image,
                language: "en"
            });

            const res = await newUser.save();

            const token = generateToken(res);

            // const newtoken = new Token({
            //     id: user.id,
            // email: user.email,
            // username: user.username
            //     _userId: user._id,
            //     token: crypto.randomBytes(16).toString('hex') 
            // });

            // console.log("IMAGEN:", image);

            // const tokenMail = await token.save()

            // console.log("token mail:", user.email);
            // console.log("mail:", newUser.email);
            // console.log("token mail:", valid.email);
            // console.log("token mail:", email);
            // console.log("token:", token);
            
            const link = `<a href="http://localhost:3000/confirmation/${token}">Activate</a>`;
            // Send the email

            var transporter = nodemailer.createTransport({ 
                service: 'gmail', 
                auth: {
                    user: 'willfln34@gmail.com',
                    pass: 'matcha1234'
                }
            });

            var mailOptions = { 
                from: '"Hypertube" <no-reply@hypertube.com>',
                to: newUser.email,
                subject: 'Account Verification', 
                text: `Hello!,\n . ${link} `};
            
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message sent: %s', info.messageId);
                });

            return {
                ...res._doc,
                id: res._id,
                token
            };
        },
        async modifyPassword ( _, { userId, oldPassword, newPassword, confirmPassword }) {
            const { valid, errors } = validatePasswordsInput(
                oldPassword,
                newPassword,
                confirmPassword,
            )
            if (!valid) {
                throw new UserInputError('Errors', { errors });
            }
            const user = await User.findById(userId);
            const match = await bcrypt.compare(oldPassword, user.password);
            if (!match) {
                errors.oldPassword = 'Wrong password';
                throw new UserInputError('Wrong crendetials', { errors });
            } else {
                newPassword = await bcrypt.hash(newPassword, 12);
                const res = await User.findByIdAndUpdate({ _id: user.id }, { password: newPassword }, {new: true})
                const token = generateToken(user);

                return {
                    ...res._doc,
                    id: res._id,
                    token,
                }
            }
        },
        async editProfile( _, { userId, username, prenom, nom, email, image }) {
            const { valid, errors } = validateEditInput(
                username,
                prenom,
                nom,
                email,
                image
            )
            if (!valid) {
                throw new UserInputError('Errors', { errors });
            }
            const user = await User.findById(userId);
            if (user.email !== email) {
                const verifyEmail = await User.findOne({ email });
                if (verifyEmail) {
                    throw new UserInputError('Email is taken', {
                        errors: {
                            email: "This email is taken"
                        }
                    });
                }
            }
            if (user.username !== username) {
                const verifyUsername = await User.findOne({ username });
                if (verifyUsername) {
                    throw new UserInputError('Username is taken', {
                        errors: {
                            email: "This username is taken"
                        }
                    });
                }
            }
            const res = await User.findByIdAndUpdate({ _id: userId }, { email: email, username: username, prenom: prenom, nom: nom, image: image }, {new: true})
            const token = generateToken(user);
            return {
                ...res._doc,
                id: res._id,
                token,
            }
        },
        async setLanguage( _, {userId, language}) {
            const res = await User.findByIdAndUpdate({ _id: userId }, { language: language}, {new: true})
            return {
                ...res._doc,
                id: res._id
            }
        }
    }
};
