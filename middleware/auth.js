module.exports = {
    ensureAuth: (req, res, next) => {
        if (req.session.user) {
            return next()
        }
        else{
            res.status(401).json({
                message: "unauthorized"
            });
        }
    },
    ensureGuest: (req, res, next) =>{
        if (req.session.user) {
            res.status(200).json({message: `welcome ${req.session.user.email}`})
        }else{
            return next()
        }
    }
}