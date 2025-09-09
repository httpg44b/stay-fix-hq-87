import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt' | 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  pt: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.newTicket': 'Novo Chamado',
    'nav.tickets': 'Chamados',
    'nav.myTickets': 'Meus Chamados',
    'nav.users': 'Usuários',
    'nav.hotels': 'Hotéis',
    'nav.settings': 'Configurações',
    'nav.logout': 'Sair',
    
    // Auth
    'auth.login': 'Entrar',
    'auth.email': 'Email',
    'auth.password': 'Senha',
    'auth.forgotPassword': 'Esqueci a senha',
    'auth.loggingIn': 'Entrando...',
    'auth.profile': 'Perfil',
    
    // Dashboard
    'dashboard.welcome': 'Bem-vindo',
    'dashboard.overview': 'Visão Geral',
    'dashboard.openTickets': 'Chamados Abertos',
    'dashboard.inProgress': 'Em Atendimento',
    'dashboard.waitingParts': 'Aguardando Peça',
    'dashboard.completed': 'Concluídos',
    'dashboard.monthlyCompleted': 'Concluídos no Mês',
    'dashboard.avgTime': 'Tempo Médio',
    'dashboard.activeTickets': 'Chamados Ativos',
    'dashboard.myActiveTickets': 'Meus Ativos',
    
    // Tickets
    'ticket.title': 'Título',
    'ticket.status': 'Status',
    'ticket.priority': 'Prioridade',
    'ticket.category': 'Categoria',
    'ticket.room': 'Quarto',
    'ticket.area': 'Área',
    'ticket.description': 'Descrição',
    'ticket.assignedTo': 'Técnico',
    'ticket.createdAt': 'Criado em',
    'ticket.updatedAt': 'Atualizado em',
    'ticket.actions': 'Ações',
    'ticket.assume': 'Assumir',
    'ticket.complete': 'Concluir',
    'ticket.cancel': 'Cancelar',
    'ticket.reopen': 'Reabrir',
    'ticket.update': 'Atualizar',
    'ticket.new': 'Novo',
    
    // Settings
    'settings.title': 'Configurações',
    'settings.profile': 'Perfil',
    'settings.theme': 'Tema',
    'settings.language': 'Idioma',
    'settings.changePassword': 'Alterar Senha',
    'settings.currentPassword': 'Senha Atual',
    'settings.newPassword': 'Nova Senha',
    'settings.confirmPassword': 'Confirmar Senha',
    'settings.save': 'Salvar',
    'settings.themeLight': 'Claro',
    'settings.themeDark': 'Escuro',
    'settings.themeSystem': 'Sistema',
    
    // Status
    'status.new': 'Novo',
    'status.inProgress': 'Em Atendimento',
    'status.waitingParts': 'Aguardando Peça',
    'status.completed': 'Concluído',
    'status.cancelled': 'Cancelado',
    
    // Priority
    'priority.low': 'Baixa',
    'priority.medium': 'Média',
    'priority.high': 'Alta',
    'priority.urgent': 'Urgente',
  },
  
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.newTicket': 'New Ticket',
    'nav.tickets': 'Tickets',
    'nav.myTickets': 'My Tickets',
    'nav.users': 'Users',
    'nav.hotels': 'Hotels',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Auth
    'auth.login': 'Login',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password',
    'auth.loggingIn': 'Logging in...',
    'auth.profile': 'Profile',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.overview': 'Overview',
    'dashboard.openTickets': 'Open Tickets',
    'dashboard.inProgress': 'In Progress',
    'dashboard.waitingParts': 'Waiting for Parts',
    'dashboard.completed': 'Completed',
    'dashboard.monthlyCompleted': 'Monthly Completed',
    'dashboard.avgTime': 'Average Time',
    'dashboard.activeTickets': 'Active Tickets',
    'dashboard.myActiveTickets': 'My Active',
    
    // Tickets
    'ticket.title': 'Title',
    'ticket.status': 'Status',
    'ticket.priority': 'Priority',
    'ticket.category': 'Category',
    'ticket.room': 'Room',
    'ticket.area': 'Area',
    'ticket.description': 'Description',
    'ticket.assignedTo': 'Technician',
    'ticket.createdAt': 'Created at',
    'ticket.updatedAt': 'Updated at',
    'ticket.actions': 'Actions',
    'ticket.assume': 'Assume',
    'ticket.complete': 'Complete',
    'ticket.cancel': 'Cancel',
    'ticket.reopen': 'Reopen',
    'ticket.update': 'Update',
    'ticket.new': 'New',
    
    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.changePassword': 'Change Password',
    'settings.currentPassword': 'Current Password',
    'settings.newPassword': 'New Password',
    'settings.confirmPassword': 'Confirm Password',
    'settings.save': 'Save',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',
    'settings.themeSystem': 'System',
    
    // Status
    'status.new': 'New',
    'status.inProgress': 'In Progress',
    'status.waitingParts': 'Waiting Parts',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    
    // Priority
    'priority.low': 'Low',
    'priority.medium': 'Medium',
    'priority.high': 'High',
    'priority.urgent': 'Urgent',
  },
  
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.newTicket': 'Nouveau Ticket',
    'nav.tickets': 'Tickets',
    'nav.myTickets': 'Mes Tickets',
    'nav.users': 'Utilisateurs',
    'nav.hotels': 'Hôtels',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',
    
    // Auth
    'auth.login': 'Connexion',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié',
    'auth.loggingIn': 'Connexion...',
    'auth.profile': 'Profil',
    
    // Dashboard
    'dashboard.welcome': 'Bienvenue',
    'dashboard.overview': 'Vue d\'ensemble',
    'dashboard.openTickets': 'Tickets Ouverts',
    'dashboard.inProgress': 'En Cours',
    'dashboard.waitingParts': 'En Attente de Pièces',
    'dashboard.completed': 'Terminés',
    'dashboard.monthlyCompleted': 'Terminés ce Mois',
    'dashboard.avgTime': 'Temps Moyen',
    'dashboard.activeTickets': 'Tickets Actifs',
    'dashboard.myActiveTickets': 'Mes Actifs',
    
    // Tickets
    'ticket.title': 'Titre',
    'ticket.status': 'Statut',
    'ticket.priority': 'Priorité',
    'ticket.category': 'Catégorie',
    'ticket.room': 'Chambre',
    'ticket.area': 'Zone',
    'ticket.description': 'Description',
    'ticket.assignedTo': 'Technicien',
    'ticket.createdAt': 'Créé le',
    'ticket.updatedAt': 'Mis à jour le',
    'ticket.actions': 'Actions',
    'ticket.assume': 'Prendre en charge',
    'ticket.complete': 'Terminer',
    'ticket.cancel': 'Annuler',
    'ticket.reopen': 'Rouvrir',
    'ticket.update': 'Mettre à jour',
    'ticket.new': 'Nouveau',
    
    // Settings
    'settings.title': 'Paramètres',
    'settings.profile': 'Profil',
    'settings.theme': 'Thème',
    'settings.language': 'Langue',
    'settings.changePassword': 'Changer le mot de passe',
    'settings.currentPassword': 'Mot de passe actuel',
    'settings.newPassword': 'Nouveau mot de passe',
    'settings.confirmPassword': 'Confirmer le mot de passe',
    'settings.save': 'Enregistrer',
    'settings.themeLight': 'Clair',
    'settings.themeDark': 'Sombre',
    'settings.themeSystem': 'Système',
    
    // Status
    'status.new': 'Nouveau',
    'status.inProgress': 'En Cours',
    'status.waitingParts': 'En Attente',
    'status.completed': 'Terminé',
    'status.cancelled': 'Annulé',
    
    // Priority
    'priority.low': 'Faible',
    'priority.medium': 'Moyenne',
    'priority.high': 'Haute',
    'priority.urgent': 'Urgent',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'fr'; // Francês como padrão para implantação na França
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['pt']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};