import {
  Component,
  createEffect,
  createResource,
  createSelector,
  createSignal,
  For,
  Match,
  Show,
  Switch,
} from "solid-js";
import { render } from "solid-js/dom";
import { Pokedex } from "@amoutonbrady/pokeapi";
import { Pokemon, Sprites, Stat } from "./types/pokemon";
import { createComputed } from "solid-js";

// -- Globals
const pokedex = new Pokedex();
const fetchPokemons = () =>
  pokedex.getPokemonsList({ limit: 151, offset: 0 }).then(({ results }) => results);
const fetchPokemon = (name: string) => () => pokedex.getPokemonByName(name);
const fetchDescription = (name: string) => () =>
  pokedex
    .getPokemonSpeciesByName(name)
    .then(
      ({ flavor_text_entries }) =>
        [
          ...new Set(
            flavor_text_entries
              .filter((desc) => desc.language.name === "en")
              .map(({ flavor_text }) => flavor_text.replace(/(|)/g, ""))
          ),
        ] as string[]
    );

// -- Utils
const isString = (str: unknown): str is string => typeof str === "string";

// -- Components / Partials
const Loader: Component = () => (
  <div class="flex justify-center">
    <i class="nes-pokeball mt-4 animate-spin"></i>
  </div>
);

type PokemonSpritesProps = { pokemon: string; sprites: Sprites; isLoading: boolean };
const PokemonSprites: Component<PokemonSpritesProps> = (props) => {
  // Compute recusively all the sprites url as a single array
  const flattenSprites = (sprites?: Sprites): string[] => {
    return Object.values(sprites || props.sprites)
      .filter(Boolean)
      .map((sprite) => (isString(sprite) ? sprite : flattenSprites(sprite)))
      .flat();
  };

  const Row = (sprite: string) => (
    <li>
      <img
        src={sprite}
        alt={`${props.pokemon} sprite`}
        class="w-full block max-w-none"
        style="image-rendering: pixelated"
      />
    </li>
  );

  return (
    <div class="nes-container with-title is-rounded flex flex-col" style="max-height: 65vh">
      <h2 class="title w-0">{props.isLoading ? "Loading..." : "Sprites"}</h2>

      <Show when={!props.isLoading} fallback={<Loader />}>
        <ul class="grid grid-cols-4 gap-4 overflow-auto flex-1">
          <For each={flattenSprites()} children={Row} />
        </ul>
      </Show>
    </div>
  );
};

type PokemonDetailsProps = { pokemon: Pokemon; isLoading: boolean };
const PokemonDetails: Component<PokemonDetailsProps> = (props) => {
  const [descriptions, loadDescriptions] = createResource<string[]>([]);
  const [tab, setTab] = createSignal(1);
  const isSelected = (t: number) => tab() === t;

  createComputed(() => {
    if (!isSelected(3)) return;
    loadDescriptions(fetchDescription(props.pokemon.name));
  });

  const StatRow = (stat: Stat) => (
    <li class="flex flex-col pr-4">
      <div class="flex justify-between items-start">
        <label for={stat.stat.name} class="capitalize mr-auto">
          {stat.stat.name}
        </label>
        <span>{stat.base_stat}</span>
      </div>
      <progress
        id={stat.stat.name}
        value={stat.base_stat}
        class="nes-progress h-6 max-w-full"
        classList={{
          "is-success": stat.base_stat >= 50,
          "is-warning": stat.base_stat >= 25 && stat.base_stat < 50,
          "is-error": stat.base_stat < 25,
        }}
        max="100"
      />
    </li>
  );

  return (
    <div
      class="nes-container with-title is-rounded relative flex flex-col"
      style="max-height: 65vh"
    >
      <h2 class="title w-0 capitalize mr-auto">
        {props.isLoading ? "loading..." : props.pokemon.name}
      </h2>

      <Show when={!props.isLoading} fallback={<Loader />}>
        <div class="flex justify-between space-x-3">
          <button
            onClick={[setTab, 1]}
            class="nes-btn text-xs uppercase"
            classList={{ "is-primary": isSelected(1) }}
          >
            Stat.
          </button>
          <button
            onClick={[setTab, 2]}
            class="nes-btn text-xs uppercase"
            classList={{ "is-primary": isSelected(2) }}
          >
            Abil.
          </button>
          <button
            onClick={[setTab, 3]}
            class="nes-btn text-xs uppercase"
            classList={{ "is-primary": isSelected(3) }}
          >
            Desc.
          </button>
        </div>
        <Switch>
          <Match when={isSelected(1)}>
            <ul class="mt-4">
              <li>Height: {props.pokemon.height / 10}m</li>
              <li>Weight: {props.pokemon.weight / 10}kg</li>
            </ul>

            <ul class="flex flex-col space-y-4 mt-6 flex-1 overflow-auto">
              <For each={props.pokemon.stats} children={StatRow} />
            </ul>
          </Match>
          <Match when={isSelected(2)}>
            <h3 class="mt-4">Abilities</h3>
            <ul class="mt-2 flex flex-col space-y-4">
              <For each={props.pokemon.abilities}>
                {({ ability }) => <li class="text-sm">{ability.name}</li>}
              </For>
            </ul>

            <h3 class="mt-6">Moves</h3>
            <ul class="mt-2 flex-1 overflow-auto flex flex-col space-y-4">
              <For each={props.pokemon.moves}>
                {({ move }) => <li class="text-sm">{move.name}</li>}
              </For>
            </ul>
          </Match>
          <Match when={isSelected(3)}>
            <Show when={!descriptions.loading} fallback={<Loader />}>
              <div class="flex flex-col space-y-4 py-4 whitespace-pre-line overflow-auto flex-1">
                <For each={descriptions()}>{(desc) => <p class="text-sm" innerHTML={desc} />}</For>
              </div>
            </Show>
          </Match>
        </Switch>
      </Show>
    </div>
  );
};

// -- Application
const App: Component = () => {
  const [pokemons, loadPokemons] = createResource<{ name: string; url: string }[]>([]);
  const findPokemon = (name: string) => pokemons().find((p) => p.name === name);
  loadPokemons(fetchPokemons);

  const [pokemon, loadPokemon] = createResource<Pokemon>(null);
  const [search, setSearch] = createSignal("");

  createComputed(() => {
    const hasSearchStarted = !!search().length;
    const isPokemonSelected = !!pokemon() || pokemon.loading;
    const pokemonsLoaded = !!pokemons().length;
    console.log(pokemon());

    if (!pokemonsLoaded || hasSearchStarted || isPokemonSelected) return;

    // Fetch the first pokemon of the list
    const first = pokemons()[0];
    loadPokemon(fetchPokemon(first.name));
  });

  createComputed(() => {
    const pokemon = findPokemon(search());
    if (!pokemon) return;
    setSearch("");
    loadPokemon(fetchPokemon(pokemon.name));
  });

  // Computed boolean to know if the search match a pokemon in the list
  const isSearchValid = () => {
    const isSearchEmpty = !search().length;
    const pokemonExists = !!findPokemon(search());
    return isSearchEmpty || pokemonExists;
  };

  return (
    <main class="container mx-auto py-12 px-2 md:px-8">
      <div class="nes-container is-rounded with-title bg-white">
        <h1 class="title w-0">Pokédex</h1>

        <form
          class="nes-field"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isSearchValid()) return;
            loadPokemon(fetchPokemon(search()));
          }}
        >
          <label for="pokemon-search">Search a pokémon:</label>
          <input
            id="pokemon-search"
            type="search"
            list="pokemons-list"
            autocomplete="off"
            class="nes-input"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            classList={{ "is-error": !isSearchValid() }}
          />
          <datalist id="pokemons-list">
            <For each={pokemons()}>{(pokemon) => <option value={pokemon.name} />}</For>
          </datalist>
          <button type="submit" class="sr-only">
            Search
          </button>
        </form>

        <div class="grid md:grid-cols-2 py-4 gap-4">
          <Show when={pokemon()}>
            <PokemonDetails pokemon={pokemon()} isLoading={pokemon.loading} />
            <PokemonSprites
              pokemon={pokemon().name}
              sprites={pokemon().sprites}
              isLoading={pokemon.loading}
            />
          </Show>
        </div>

        <footer class="flex justify-end">
          <a href="https://github.com/amoutonbrady/pokedex" target="_blank" rel="noopener">
            source
          </a>
        </footer>
      </div>
    </main>
  );
};

render(() => App, document.getElementById("app"));
