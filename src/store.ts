import { writable } from "svelte/store";
import type PrivateAIPlugin from "./main";

const plugin = writable<PrivateAIPlugin>();

const needUpdateDB = writable<boolean>(false);


// export type CommentType = {
//     id:string
//     author: string;
//     text: string ;
//     cnt: number;
// };
// const comments= writable<CommentType[]>();

export  { plugin,needUpdateDB };