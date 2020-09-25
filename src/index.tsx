import { Component, createEffect, createResource, createSignal, For, Show } from "solid-js";
import { render } from "solid-js/dom";
import { Pokedex } from "@amoutonbrady/pokeapi";
import { Pokemon, Sprites, Stat } from "./types/pokemon";
import { createComputed } from "solid-js";

// -- Globals
const pokedex = new Pokedex();
const fetchPokemons = () =>
  pokedex.getPokemonsList({ limit: 151, offset: 0 }).then(({ results }) => results);
const fetchPokemon = (name: string) => () => pokedex.getPokemonByName(name);

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
    <div class="nes-container with-title is-rounded">
      <h2 class="title">{props.isLoading ? "Loading..." : "Sprites"}</h2>

      <Show when={!props.isLoading} fallback={<Loader />}>
        <ul class="grid grid-cols-4 gap-4 overflow-auto" style="max-height: 50vh">
          <For each={flattenSprites()} children={Row} />
        </ul>
      </Show>
    </div>
  );
};

type PokemonDetailsProps = { pokemon: Pokemon; isLoading: boolean };
const PokemonDetails: Component<PokemonDetailsProps> = (props) => {
  const StatRow = (stat: Stat) => (
    <li class="flex flex-col">
      <div class="flex justify-between items-start">
        <label for={stat.stat.name} class="capitalize mr-auto">
          {stat.stat.name}
        </label>
        <span>{stat.base_stat}</span>
      </div>
      <progress
        id={stat.stat.name}
        value={stat.base_stat}
        class="nes-progress h-6"
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
    <div class="nes-container with-title is-rounded">
      <h2 class="title capitalize">{props.isLoading ? "loading..." : props.pokemon.name}</h2>

      <Show when={!props.isLoading} fallback={<Loader />}>
        <ul>
          <li>Height: {props.pokemon.height / 10}m</li>
          <li>Weight: {props.pokemon.weight / 10}kg</li>
        </ul>

        <ul class="flex flex-col space-y-4 mt-6">
          <For each={props.pokemon.stats} children={StatRow} />
        </ul>
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

  createEffect(() => {
    const hasSearchStarted = !!search().length;
    const isPokemonSelected = !!pokemon() || pokemon.loading;
    const pokemonsLoaded = !!pokemons().length;

    if (!pokemonsLoaded || hasSearchStarted || isPokemonSelected) return;

    // Fetch the first pokemon of the list
    const first = pokemons()[0];
    loadPokemon(fetchPokemon(first.name));
  });

  createEffect(() => {
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
        <h1 class="title">Pokédex</h1>

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
          <datalist id="pokemons-list" class="w-full">
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
      </div>
    </main>
  );
};

render(() => App, document.getElementById("app"));
