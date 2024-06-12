<script lang="ts">
	export let variable: number;
	import type PrivateAIPlugin from "../main";
	import { plugin } from "../store";
	// import {i18n} from "i18next";
	import _ from "../config";
</script>

<div class="number">
	<span
		>My number is {variable}
		{$plugin.settings.mySetting}
		{$_.t("settings.language.lang")}!</span
	>
</div>

<style>
	.number {
		color: red;
	}
</style>
