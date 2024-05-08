<script lang="ts">
    export let variable: number;
    import type MyPlugin from "../main";
    // import store from "../store"
    import {plugin} from "../store"

    // let nplugin: MyPlugin=$plugin;
    // plugin.subscribe((p) => (nplugin = p));
</script>

<div class="number">
    <span>My number is {variable} {$plugin.settings.mySetting}!</span>
  </div>
  
  <style>
    .number {
      color: red;
    }
  </style>