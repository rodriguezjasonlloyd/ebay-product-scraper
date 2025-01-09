import axios from "axios";
import csv from "csv-parser";
import { load } from "cheerio";
import * as fs from "fs";
import path from "path";

interface Item {
    link: string;
    name: string;
    file: string;
}

const items: Item[] = [];

const dir = "./images";

fs.createReadStream('data.csv')
    .pipe(csv())
    .on('data', (row) => items.push(row))
    .on('end', async () => {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            const targetDir = path.join(dir, item.name);

            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true });
            }

            fs.mkdirSync(targetDir, { recursive: true });

            const response = await axios.get(item.link);

            const $ = load(response.data);

            const images: string[] = $(".x-photos-max-view .lightbox-dialog .lightbox-dialog__window .lightbox-dialog__main .ux-image-carousel-container img")
                .map((_, img) => (img.attribs.src === undefined) ? img.attribs['data-src'] : img.attribs.src)
                .get()
                .filter(x => x !== undefined);

            if (images.length == 1) {
                downloadImage(images[0], path.join(dir, item.name, `${item.name}_${(1).toString()}.jpg`));
                downloadImage(images[0], path.join(dir, item.name, `${item.name}_${(2).toString()}.jpg`));
            } else {
                for (const [i, image] of images.entries()) {
                    if (i == 11) break;
                    downloadImage(image, path.join(dir, item.name, `${item.name}_${(i + 1).toString()}.jpg`));
                }
            }

            console.log(`Downloaded ${i + 1}/${items.length} | ${images.length} images for ${item.name}`);
        }
    });

const downloadImage = async (url: string, savePath: string) => {
    try {
        const response = await axios({
            url,
            method: "GET",
            responseType: "stream",
        });

        const writer = fs.createWriteStream(savePath);

        response.data.pipe(writer);

        return new Promise<void>((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
    } catch (error) {
        console.error(`Failed to download ${url}:`, error);
    }
};
