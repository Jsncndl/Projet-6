const Sauce = require("../models/Sauce");
const fs = require("fs");

exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);

  const sauce = new Sauce({
    ...sauceObject,
    likes: 0,
    dislikes: 0,
    usersDisliked: [],
    usersLiked: [],
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
  });
  sauce
    .save()
    .then(() => res.status(201).json({ message: "Sauce enregistré !" }))
    .catch((error) => res.status(400).json({ error }));
};

exports.getAllSauces = (req, res, next) => {
  Sauce.find()
    .then((sauces) => res.status(200).json(sauces))
    .catch((error) => res.status(400).json({ error }));
};

exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(400).json({ error }));
};

exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file
    ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
      }
    : { ...req.body };

  Sauce.findOne({ _id: req.params.id }).then((sauce) => {
    if (sauce.userId !== req.auth.userId) {
      res.status(401).json({ message: "Not authorized" });
    } else {
      const filename = sauce.imageUrl.split("/images/")[1];
      console.log(sauce.imageUrl.split("/images/")[1]);
      fs.unlink(`images/${filename}`, () => {
        Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
          .then(() => res.status(200).json({ message: "Sauce modifié" }))
          .catch((error) => res.status(400).json({ error }));
      });
    }
  });
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId !== req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        const filename = sauce.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => res.status(200).json({ message: "Sauce supprimé" }))
            .catch((error) => res.status(400).json({ error }));
        });
      }
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.likeSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      const newValues = {
        usersLiked: sauce.usersLiked,
        usersDisliked: sauce.usersDisliked,
        likes: 0,
        dislikes: 0,
      };
      switch (req.body.like) {
        case 1:
          newValues.usersLiked.push(req.body.userId);
          break;
        case -1:
          newValues.usersDisliked.push(req.body.userId);
          break;
        case 0:
          // ANNULATION LIKE //
          if (newValues.usersLiked.includes(req.body.userId)) {
            const index = newValues.usersLiked.indexOf(req.body.userId);
            newValues.usersLiked.splice(index, 1);
          }
          // ANNULATION DISLIKE //
          else {
            const index = newValues.usersDisliked.indexOf(req.body.userId);
            newValues.usersDisliked.splice(index, 1);
          }
          break;
      }
      // CALCUL LIKES & DISLIKES //
      newValues.likes = newValues.usersLiked.length;
      newValues.dislikes = newValues.usersDisliked.length;
      // MAJ SAUCE AVEC NewValues //
      Sauce.updateOne({ _id: req.params.id }, newValues)
        .then(() => res.status(200).json({ message: "Note attribuée" }))
        .catch((error) => res.status(400).json({ error }));
    })
    .catch((error) => res.status(500).json({ error }));
};
