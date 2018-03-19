import * as mongoose from 'mongoose'
import * as bcrypt from 'bcrypt'
import handleHttpError from '../utils/handle_error'
import Profile from '../models/profile'

function handleSignUp (req: any, res: any) {
    const emailRegex = /^\w+@\w+\..{2,3}(.{2,3})?$/
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_=+-]).{8,}$/

    if (req.body) {
        const {
            fullName,
            email,
            password,
            repeatPassword,
            ownGender,
            lookingForGender,
        } = req.body

        if (email.length && emailRegex.test(email)) {
            Profile.find({ email: email.toLowerCase() })
                .exec()
                .then((user: any) => {
                    if (user.length) {
                        console.error('Mail already exists!')
                        handleHttpError(req, res, 409, 'Mail already exists', '/')
                    } else {
                        bcrypt.hash(req.body.password, 10, (error: any, hash: string) => {
                            if (error) {
                                console.error(error)
                                handleHttpError(req, res, 400, 'Bad Request', '/')
                            } else {
                                if (
                                    fullName && fullName.length &&
                                    password && password.length && passwordRegex.test(password) && repeatPassword === password &&
                                    ownGender && ownGender.length &&
                                    lookingForGender && lookingForGender.length
                                ) {
                                    const newUser = new Profile({
                                        _id: new mongoose.Types.ObjectId(),
                                        fullName,
                                        firstName: fullName && fullName.length && fullName.substr(0, fullName.indexOf(' ')),
                                        email: email.toLowerCase(),
                                        password: hash,
                                        ownGender,
                                        matchSettings: {
                                            lookingForGender,
                                        },
                                    })

                                    newUser.save()
                                        .then(result => {
                                            req.session.userId = result._id
                                            res.status(200).redirect(`/questionaire`)
                                        })
                                        .catch(error => {
                                            console.error(error)
                                            handleHttpError(req, res, 500, 'Internal Server Error', '/')
                                        })
                                }
                            }
                        })
                    }
                })
        } else {
            handleHttpError(req, res, 422, 'Unprocessable Entity', '/')
        }
    }
}

export default handleSignUp
