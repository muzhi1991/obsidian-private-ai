import { writable } from "svelte/store";
import type PrivateAIPlugin from "./main";

const plugin = writable<PrivateAIPlugin>();



// export type CommentType = {
//     id:string
//     author: string;
//     text: string ;
//     cnt: number;
// };
// const comments= writable<CommentType[]>();

export  { plugin };