import { writable } from "svelte/store";
import type MyPlugin from "./main";

const plugin = writable<MyPlugin>();
export  { plugin };