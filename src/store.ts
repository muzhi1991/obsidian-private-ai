import { writable } from "svelte/store";
import type MyPlugin from "./main";

const plugin = writable<MyPlugin>();



// export type CommentType = {
//     id:string
//     author: string;
//     text: string ;
//     cnt: number;
// };
// const comments= writable<CommentType[]>();

export  { plugin };