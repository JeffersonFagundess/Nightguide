"use client";

import { useEffect, useState } from "react";

export type ThemePreference = "dark" | "light";
export type LanguagePreference = "pt" | "en";

const themeKey = "nightguide-theme";
const languageKey = "nightguide-language";
const preferenceEvent = "nightguide-preferences";

export function usePreferences() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "dark";
    const storedTheme = localStorage.getItem(themeKey);
    return storedTheme === "light" ? "light" : "dark";
  });
  const [language, setLanguageState] = useState<LanguagePreference>(() => {
    if (typeof window === "undefined") return "pt";
    const storedLanguage = localStorage.getItem(languageKey);
    return storedLanguage === "en" ? "en" : "pt";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";

    function syncPreferences() {
      const nextTheme = localStorage.getItem(themeKey) as ThemePreference | null;
      const nextLanguage = localStorage.getItem(languageKey) as LanguagePreference | null;
      if (nextTheme === "dark" || nextTheme === "light") setThemeState(nextTheme);
      if (nextLanguage === "pt" || nextLanguage === "en") setLanguageState(nextLanguage);
    }

    window.addEventListener(preferenceEvent, syncPreferences);
    return () => window.removeEventListener(preferenceEvent, syncPreferences);
  }, [language, theme]);

  function setTheme(nextTheme: ThemePreference) {
    localStorage.setItem(themeKey, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setThemeState(nextTheme);
    window.dispatchEvent(new Event(preferenceEvent));
  }

  function setLanguage(nextLanguage: LanguagePreference) {
    localStorage.setItem(languageKey, nextLanguage);
    document.documentElement.lang = nextLanguage === "pt" ? "pt-BR" : "en";
    setLanguageState(nextLanguage);
    window.dispatchEvent(new Event(preferenceEvent));
  }

  return { theme, language, setTheme, setLanguage };
}

export const copy = {
  pt: {
    nav: {
      featured: "Destaques",
      map: "Mapa",
      account: "Minha conta",
      signIn: "Entrar",
      signOut: "Sair",
      preferences: "Preferências",
      theme: "Tema",
      language: "Idioma",
      dark: "Escuro",
      light: "Claro",
      portuguese: "Português",
      english: "Inglês",
    },
    carousel: {
      eyebrow: "Descubra perto de você",
      headline: "O que fazer hoje à noite?",
      description: "Eventos, bares e experiências de Saquarema em um só lugar.",
      featured: "Em destaque agora",
      entry: "Entrada",
      details: "Ver detalhes",
      previous: "Evento anterior",
      next: "Próximo evento",
      select: "Selecionar",
    },
    filters: {
      all: "Todos",
      parties: "Festas e shows",
      food: "Gastronomia",
      live: "Ao vivo",
      comedy: "Stand-up",
      free: "Grátis",
      nearby: "Perto de mim",
      beach: "Praia",
    },
    home: {
      searchPlaceholder: "Buscar eventos, artistas, lugares ou categorias",
      searchButton: "Buscar",
      explore: "Explore",
      collectionsTitle: "Coleções para escolher rápido",
      eventsTitle: "Eventos em Saquarema",
      result: "resultado",
      results: "resultados",
      inFilter: "em",
      viewMap: "Ver no mapa",
      mapEyebrow: "Mapa",
      mapTitle: "Escolha pelo clima do lugar.",
      mapText: "Locais organizados por proximidade, nota e tipo de experiência para diminuir a indecisão antes de sair.",
      guideEyebrow: "Guia da noite",
      guideTitle: "Saia com a programação pronta.",
      guideText: "Escolha um clima, compare os eventos da semana e salve seus lugares favoritos para montar o roteiro.",
      routeCta: "Montar meu roteiro",
      emptyTitle: "Nenhum evento encontrado",
      emptyText: "Tente outra busca ou limpe os filtros.",
      clearFilters: "Limpar filtros",
    },
    collections: {
      shows: ["Festas e shows", "Line-ups, pistas e música ao vivo."],
      beach: ["Perto da praia", "Orla, sunset e clima de litoral."],
      hot: ["Mais quentes", "Eventos com mais movimento na semana."],
      free: ["Entrada grátis", "Rolês para sair sem pesar no bolso."],
    },
    cards: {
      details: "Detalhes",
      save: "Salvar evento",
      remove: "Remover dos favoritos",
      agenda: "Agenda",
      agendaText: "Eventos por dia e horário.",
      vibe: "Clima",
      vibeText: "Samba, DJ, rock, sunset e mais.",
      favorites: "Favoritos",
      favoritesText: "Guarde os rolês que combinam com você.",
    },
    modal: {
      closeDetails: "Fechar detalhes",
      closeVenue: "Fechar local",
      when: "Quando",
      venue: "Local",
      mood: "Clima",
      distance: "Distância",
      description: "Descrição",
      entry: "Entrada",
      extraDescription:
        "A programação inclui recepção, ambiente instagramável, atendimento no local e curadoria musical pensada para quem quer aproveitar a noite sem improviso.",
      want: "Quero ir",
      saved: "Salvo",
      save: "Salvar",
      address: "Endereço",
      rating: "Avaliação",
      stars: "estrelas",
      venueText:
        "Local indicado para quem busca uma experiência prática em Saquarema, com endereço fácil de localizar e programação conectada à vida noturna da cidade.",
    },
    auth: {
      loginTitle: "Entre para salvar sua noite.",
      loginText: "Acesse sua conta para salvar eventos, reservar ingressos e montar seu roteiro.",
      registerTitle: "Crie seu perfil no NightGuide.",
      registerText: "Use email e senha para salvar eventos e continuar sua compra.",
      name: "Nome",
      namePlaceholder: "Seu nome",
      email: "Email",
      password: "Senha",
      passwordPlaceholder: "Mínimo de 6 caracteres",
      processing: "Processando...",
      signIn: "Entrar",
      createAccount: "Criar conta",
      continueWithGoogle: "Continuar com Google",
      noAccount: "Ainda não tem conta?",
      hasAccount: "Já tem conta?",
    },
  },
  en: {
    nav: {
      featured: "Featured",
      map: "Map",
      account: "My account",
      signIn: "Sign in",
      signOut: "Sign out",
      preferences: "Preferences",
      theme: "Theme",
      language: "Language",
      dark: "Dark",
      light: "Light",
      portuguese: "Portuguese",
      english: "English",
    },
    carousel: {
      eyebrow: "Discover nearby",
      headline: "What to do tonight?",
      description: "Events, bars and experiences in Saquarema in one place.",
      featured: "Featured now",
      entry: "Entry",
      details: "View details",
      previous: "Previous event",
      next: "Next event",
      select: "Select",
    },
    filters: {
      all: "All",
      parties: "Parties and shows",
      food: "Food",
      live: "Live",
      comedy: "Stand-up",
      free: "Free",
      nearby: "Near me",
      beach: "Beach",
    },
    home: {
      searchPlaceholder: "Search events, artists, places or categories",
      searchButton: "Search",
      explore: "Explore",
      collectionsTitle: "Quick collections",
      eventsTitle: "Events in Saquarema",
      result: "result",
      results: "results",
      inFilter: "in",
      viewMap: "View on map",
      mapEyebrow: "Map",
      mapTitle: "Choose by the mood of the place.",
      mapText: "Places organized by distance, rating and experience type to make going out easier.",
      guideEyebrow: "Night guide",
      guideTitle: "Go out with the plan ready.",
      guideText: "Pick a mood, compare this week's events and save favorite places to build your route.",
      routeCta: "Build my route",
      emptyTitle: "No events found",
      emptyText: "Try another search or clear the filters.",
      clearFilters: "Clear filters",
    },
    collections: {
      shows: ["Parties and shows", "Lineups, dance floors and live music."],
      beach: ["Near the beach", "Seafront, sunsets and coastal energy."],
      hot: ["Trending now", "The busiest events this week."],
      free: ["Free entry", "Plans that do not hit your wallet."],
    },
    cards: {
      details: "Details",
      save: "Save event",
      remove: "Remove from favorites",
      agenda: "Schedule",
      agendaText: "Events by day and time.",
      vibe: "Mood",
      vibeText: "Samba, DJ, rock, sunset and more.",
      favorites: "Favorites",
      favoritesText: "Save the nights that fit you.",
    },
    modal: {
      closeDetails: "Close details",
      closeVenue: "Close venue",
      when: "When",
      venue: "Place",
      mood: "Mood",
      distance: "Distance",
      description: "Description",
      entry: "Entry",
      extraDescription:
        "The program includes reception, a photogenic environment, local service and music curation for a night without improvising.",
      want: "I want to go",
      saved: "Saved",
      save: "Save",
      address: "Address",
      rating: "Rating",
      stars: "stars",
      venueText:
        "A practical place in Saquarema, with an easy-to-find address and programming connected to the city's nightlife.",
    },
    auth: {
      loginTitle: "Sign in to save your night.",
      loginText: "Access your account to save events, reserve tickets and build your route.",
      registerTitle: "Create your NightGuide profile.",
      registerText: "Use email and password to save events and continue your checkout.",
      name: "Name",
      namePlaceholder: "Your name",
      email: "Email",
      password: "Password",
      passwordPlaceholder: "At least 6 characters",
      processing: "Processing...",
      signIn: "Sign in",
      createAccount: "Create account",
      continueWithGoogle: "Continue with Google",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
    },
  },
};
