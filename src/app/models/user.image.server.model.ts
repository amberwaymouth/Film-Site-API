import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'
import {getUserById} from "./user.server.model";

const setImage = async (id: number, filename: string): Promise<User[]> => {
    Logger.info(`Getting a user's profile image`);
    const conn = await getPool().getConnection();
    const query = 'update user set image_filename = ? where id = ?';
    const [ result ] = await conn.query (query, [filename, id]);
    await conn.release();
    return result;

}

const deleteImage = async (id: number): Promise<User[]> => {
    Logger.info(`Getting a user's profile image`);
    const conn = await getPool().getConnection();
    const query = 'update user set image_filename = null where id = ?';
    const [ result ] = await conn.query (query, [id]);
    await conn.release();
    return result;

}


function getExtensionFromContentType(contentType: string) {
    switch (contentType) {
        case "image/jpeg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/gif":
            return "gif";
        default:
            return "jpg";
    }
}

export{setImage, getExtensionFromContentType, deleteImage};