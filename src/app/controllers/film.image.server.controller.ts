import {Request, Response} from "express";
import Logger from "../../config/logger";
import {getUserById} from "../models/user.server.model";
import path from "path";
import {getFilmById} from "../models/film.server.model";
import * as users from "../models/user.server.model";
import * as films from "../models/film.image.server.model";
import * as film from "../models/film.server.model";
import {getExtensionFromContentType} from "../models/user.image.server.model";
import fs from "fs";


const getImage = async (req: Request, res: Response): Promise<void> => {
    const id = +req.params.id;
    try{
        if (isNaN(+id)) {
            res.statusMessage = "Bad request. Invalid information";
            res.status(400).send();
            return;
        }
        const filmy = await getFilmById(id);
        if (filmy.length === 0 || filmy[0].image_filename == null) {
            res.statusMessage = "Not Found. No film found with id, or film has no image";
            res.status(404).send();
            return;
        }
        const storagePath = path.join(__dirname, '../../../storage/images');
        const imagePath = path.join(storagePath, filmy[0].image_filename);
        res.statusMessage = 'OK';
        res.status(200).sendFile(imagePath);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        const imageData = req.body;
        const token = req.header("X-Authorization");
        const result = await users.findUserIdByToken(token);
        if (result.length === 0) {
            res.statusMessage = 'Unauthorised';
            res.status(401).send();
            return;
        } else {
            if (isNaN(+id)) {
                res.statusMessage = "Bad Request";
                res.status(400).send("invalid");
                return;
            }
            const filmy = await film.getFilmById(+id);
            if (filmy.length === 0) {
                res.statusMessage = "Not Found. No film found with id";
                res.status(404).send();
                return;
            }

            if (filmy[0].director_id !== result[0].id) {
                res.statusMessage = "Forbidden. Only the director of the film can change the hero image";
                res.status(403).send();
                return;
            }
            const fileType = req.headers[`content-type`] as string;
            const validImageTypes = [`image/gif`, `image/jpeg`, `image/png`];
            if (! validImageTypes.includes(fileType)) {
                res.statusMessage = "Bad request. Invalid image supplied (possibly incorrect file type)";
                res.status(400).send();
                return;
            }
            const extension = getExtensionFromContentType(fileType);
            const filename = `film_${id}.${extension}`;
            await films.setFilmImage(+id, filename);
            if (filmy[0].image_filename == null) {
                const storagePath = path.join(__dirname, '../../../storage/images');
                const imagePath = path.join(storagePath, filename);
                fs.writeFile(imagePath, imageData, (err: any) => {
                    if (err) {
                        res.statusMessage = "Internal server error";
                        res.status(500).send();
                    }
                });
                res.statusMessage = "Created";
                res.status(201).send();
                return;
            }
            if (filmy[0].image_filename !== null) {
                const storagePath = path.join(__dirname, '../../../storage/images');
                const imagePath = path.join(storagePath, filename);
                const oldImage = path.join(storagePath, filmy[0].image_filename);
                fs.unlink(oldImage, (err: any) => {
                    if (err) {
                        res.statusMessage = "Internal server error";
                        res.status(500).send();
                    }
                });
                fs.writeFile(imagePath, imageData, (err: any) => {
                    if (err) {
                        res.statusMessage = "Internal server error";
                        res.status(500).send();
                    }
                });
                res.statusMessage = "OK. Image updated";
                res.status(200).send();
                return;
            }
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getImage, setImage};