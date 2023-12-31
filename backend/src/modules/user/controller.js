const argon = require("argon2");
const jwt = require("jsonwebtoken");

const {
  findAll,
  findById,
  insert,
  findByMail,
  updateOne,
  deleteOne,
} = require("./model");

const getAll = ({ req, res }) => {
  findAll()
    .then(([users]) => {
      res.status(200).json(users);
    })
    .catch((err) => console.error(err));
};

const getById = (req, res) => {
  const { id } = req.params;
  findById(id)
    .then(([user]) => {
      !user
        ? res.status(400).json("ressource with the specified id does not exist")
        : res.status(200).json(user);
    })
    .catch((err) => console.error(err));
};

const register = async (req, res) => {
  const { email, password, firstname, lastname, role, agency_id } = req.body;
  if (!email) {
    res.status(400).send({ error: "Please specify email" });
    return;
  }

  try {
    const result = await insert({
      email,
      password,
      firstname,
      lastname,
      role,
      agency_id,
    });
    res
      .status(201)
      .json({ id: result.insertId, firstname, lastname, email, role });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: err.message,
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).send({ error: "Please specify both email and password" });
  }

  try {
    const [user] = await findByMail(email);
    if (!user) {
      res.status(403).json("Invalid email");
    } else {
      const { id, email, password: hash, role, agency_id, firstname, lastname } = user;
      if (await argon.verify(hash, password)) {
        const token = jwt.sign(
          { id: id, role: role, agency_id },
          process.env.JWT_AUTH_SECRET,
          {
            expiresIn: "1h",
          }
        );
        res
          .cookie("access_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
          })
          .status(200)
          .json({
            id,
            email,
            role,
            firstname,
            lastname,
          });
      } else {
        res.status(401).send({
          error: "Invalid password",
        });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Error server");
  }
};

const logout = ({ res }) => {
  return res.clearCookie("access_token").sendStatus(200);
};

const updateUser = (req, res) => {
  const id = req.userId;
  const user = req.body;
  updateOne(user, id)
    .then((user) => {
      if (user.affectedRows === 1) {
        res.status(204).json({ id, ...user });
      } else {
        res.status(404).json("No user found with this ID");
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json("error server");
    });
};

const deleteUser = (req, res) => {
  const { id } = req.params;
  deleteOne(id)
    .then((result) => {
      res.sendStatus(204).json(result);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json("error server");
    });
};

const getCurrentUser = async (req, res, next) => {
  try {
    const [user] = await findById(req.userId);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  register,
  login,
  logout,
  updateUser,
  deleteUser,
  getCurrentUser,
};
