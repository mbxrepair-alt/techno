// lib/ai.js - Version avec diagnostic différencié

/**
 * Chatbot pour l'atelier
 */
export async function chatWithAssistant(message, history = []) {
  const msg = message.toLowerCase();
  
  // ========== DIAGNOSTIC PAR TYPE D'APPAREIL ==========
  if (msg.includes("diagnostic") || msg.includes("panne") || msg.includes("problème")) {
    
    // Diagnostic Console (PS5, Xbox, Switch, Nintendo)
    if (msg.includes("ps5") || msg.includes("playstation") || msg.includes("xbox") || msg.includes("switch") || msg.includes("nintendo") || msg.includes("console")) {
      return `🎮 **DIAGNOSTIC CONSOLE - 40€**

✅ **Pour :** PS5, Xbox Series, Nintendo Switch, etc.

**Notre diagnostic comprend :**
- Test complet des composants (carte mère, alimentation, HDMI)
- Identification précise de la panne
- Devis détaillé
- 40€ déduits si vous faites réparer chez nous

⏱️ Durée : 1-2 jours

📞 **Prenez RDV : 04 72 60 16 13**`;
    }
    
    // Diagnostic Tablette
    if (msg.includes("tablette") || msg.includes("ipad") || msg.includes("galaxy tab") || msg.includes("lenovo")) {
      return `📟 **DIAGNOSTIC TABLETTE - 25€**

✅ **Pour :** iPad, Samsung Tab, Lenovo, etc.

**Notre diagnostic comprend :**
- Test complet des composants
- Identification précise de la panne
- Devis détaillé
- 25€ déduits si vous faites réparer chez nous

⏱️ Durée : 1-2 jours

📞 **Prenez RDV : 04 72 60 16 13**`;
    }
    
    // Diagnostic Smartphone complexe (iPhone haut de gamme, Samsung haut de gamme)
    if ((msg.includes("iphone") && (msg.includes("pro") || msg.includes("pro max") || msg.includes("14") || msg.includes("15"))) ||
        (msg.includes("samsung") && (msg.includes("s23") || msg.includes("s24") || msg.includes("ultra")))) {
      return `🔧 **DIAGNOSTIC SMARTPHONE COMPLEXE - 40€**

✅ **Pour :** iPhone Pro/Max (12/13/14/15), Samsung Galaxy S23/S24 Ultra

**Notre diagnostic comprend :**
- Test complet des composants
- Diagnostic électronique avancé
- Devis détaillé
- 40€ déduits si vous faites réparer chez nous

⏱️ Durée : 1-2 jours

📞 **Prenez RDV : 04 72 60 16 13**`;
    }
    
    // Diagnostic Smartphone simple (par défaut)
    return `📱 **DIAGNOSTIC SMARTPHONE - 15€**

✅ **Pour :** iPhone classique, Samsung, Xiaomi, Huawei, OnePlus, etc.

**Notre diagnostic comprend :**
- Test complet des composants
- Identification précise de la panne
- Devis détaillé
- 15€ déduits si vous faites réparer chez nous

⏱️ Durée : 30-60 min

📞 **Prenez RDV : 04 72 60 16 13**`;
  }

  // ========== IPHONE PRIX ==========
  if (msg.includes("iphone") && (msg.includes("écran") || msg.includes("cassé") || msg.includes("vitre"))) {
    if (msg.includes("iphone 14") || msg.includes("iphone14")) {
      return `📱 **ÉCRAN iPhone 14**

💰 **Prix : 229€** (écran Super Retina XDR d'origine)

✅ **Comprend :**
- Écran OLED qualité OEM
- Installation professionnelle
- Test True Tone
- Garantie 3 mois
- Diagnostic 40€ offert

⏱️ **Délai : 2-3 jours ouvrables**`;
    }
    if (msg.includes("iphone 13") || msg.includes("iphone13")) {
      return `📱 **ÉCRAN iPhone 13**

💰 **Prix : 199€** (écran Super Retina XDR)

✅ Diagnostic 40€ offert | Garantie 3 mois | Délai : 2-3 jours`;
    }
    if (msg.includes("iphone 12") || msg.includes("iphone12")) {
      return `📱 **ÉCRAN iPhone 12**

💰 **Prix : 169€** (écran Super Retina XDR)

✅ Diagnostic 15€ offert | Garantie 3 mois | Délai : 2-3 jours`;
    }
    if (msg.includes("iphone 11") || msg.includes("iphone11")) {
      return `📱 **ÉCRAN iPhone 11**

💰 **Prix : 139€** (écran Liquid Retina LCD)

✅ Diagnostic 15€ offert | Garantie 3 mois | Délai : 2-3 jours`;
    }
    return `📱 **PRIX ÉCRAN iPhone** :

- iPhone 14/14 Plus : 229€
- iPhone 13/13 Pro : 199€
- iPhone 12/12 Pro : 169€
- iPhone 11/11 Pro : 139€
- iPhone X/XR/XS : 119€
- iPhone 8/SE : 79€

✅ Diagnostic OFFERT selon modèle
✅ Garantie 3 mois

📞 **Devis gratuit : 04 72 60 16 13**`;
  }

  // Batterie iPhone
  if (msg.includes("iphone") && msg.includes("batterie")) {
    if (msg.includes("iphone 14") || msg.includes("iphone14")) {
      return `🔋 **BATTERIE iPhone 14**

💰 **Prix : 89€** (batterie d'origine)

✅ Diagnostic 40€ offert | Garantie 6 mois | Délai : 1-2 jours`;
    }
    if (msg.includes("iphone 13") || msg.includes("iphone13")) {
      return `🔋 **BATTERIE iPhone 13**

💰 **Prix : 79€** (batterie d'origine)

✅ Diagnostic 40€ offert | Garantie 6 mois | Délai : 1-2 jours`;
    }
    if (msg.includes("iphone 12") || msg.includes("iphone12")) {
      return `🔋 **BATTERIE iPhone 12**

💰 **Prix : 69€** (batterie d'origine)

✅ Diagnostic 15€ offert | Garantie 6 mois | Délai : 1-2 jours`;
    }
    if (msg.includes("iphone 11") || msg.includes("iphone11")) {
      return `🔋 **BATTERIE iPhone 11**

💰 **Prix : 59€** (batterie d'origine)

✅ Diagnostic 15€ offert | Garantie 6 mois | Délai : 1-2 jours`;
    }
    return `🔋 **PRIX BATTERIE iPhone** :

- iPhone 14 : 89€
- iPhone 13 : 79€
- iPhone 12 : 69€
- iPhone 11 : 59€
- iPhone X/XR : 55€
- iPhone 8/SE : 49€

✅ Diagnostic offert selon modèle
✅ Garantie 6 mois
✅ Taux de batterie 100% après remplacement`;
  }

  // ========== SAMSUNG PRIX ==========
  if (msg.includes("samsung") || msg.includes("galaxy")) {
    if (msg.includes("écran") || msg.includes("cassé")) {
      if (msg.includes("s23") || msg.includes("s24")) {
        return `📱 **ÉCRAN Samsung Galaxy S23/S24**

💰 **Prix : 219€** (écran Dynamic AMOLED)

✅ Diagnostic 40€ offert | Garantie 3 mois | Délai : 2-3 jours`;
      }
      if (msg.includes("s22")) {
        return `📱 **ÉCRAN Samsung Galaxy S22**

💰 **Prix : 189€** (écran Dynamic AMOLED)

✅ Diagnostic 40€ offert | Garantie 3 mois | Délai : 2-3 jours`;
      }
      if (msg.includes("s21")) {
        return `📱 **ÉCRAN Samsung Galaxy S21**

💰 **Prix : 159€** (écran Dynamic AMOLED)

✅ Diagnostic 15€ offert | Garantie 3 mois | Délai : 2-3 jours`;
      }
      if (msg.includes("a")) {
        return `📱 **ÉCRAN Samsung Galaxy A série**

💰 **Prix : 89-119€** (selon modèle)

✅ Diagnostic 15€ offert | Délai : 2-3 jours`;
      }
      return `📱 **PRIX ÉCRAN Samsung** :

- Galaxy S23/S24 Ultra : 219€
- Galaxy S22 Ultra : 189€
- Galaxy S21/S21+ : 159€
- Galaxy S20 : 139€
- Galaxy A系列 : 89-119€

✅ Diagnostic OFFERT (selon modèle)`;
    }
    if (msg.includes("batterie")) {
      if (msg.includes("s23") || msg.includes("s24")) {
        return `🔋 **BATTERIE Samsung Galaxy S23/S24**

💰 **Prix : 79€** (batterie d'origine)

✅ Diagnostic 40€ offert | Garantie 6 mois | Délai : 1-2 jours`;
      }
      if (msg.includes("s22")) {
        return `🔋 **BATTERIE Samsung Galaxy S22**

💰 **Prix : 69€** (batterie d'origine)

✅ Diagnostic 40€ offert | Garantie 6 mois | Délai : 1-2 jours`;
      }
      return `🔋 **PRIX BATTERIE Samsung** :

- Galaxy S23/S24 : 79€
- Galaxy S22 : 69€
- Galaxy S21 : 59€
- Galaxy A系列 : 49-59€

✅ Garantie 6 mois`;
    }
  }

  // ========== TABLETTES ==========
  if ((msg.includes("ipad") || msg.includes("tablette")) && (msg.includes("écran") || msg.includes("cassé"))) {
    return `📟 **ÉCRAN TABLETTE**

💰 **Prix : 89-189€** (selon modèle : iPad, Samsung Tab, etc.)

✅ **Comprend :**
- Diagnostic 25€ offert
- Pièce de qualité
- Garantie 3 mois

⏱️ Délai : 2-4 jours

📞 Devis précis : 04 72 60 16 13`;
  }

  if ((msg.includes("ipad") || msg.includes("tablette")) && msg.includes("batterie")) {
    return `🔋 **BATTERIE TABLETTE**

💰 **Prix : 59-89€**

✅ Diagnostic 25€ offert
✅ Garantie 6 mois

⏱️ Délai : 2-3 jours`;
  }

  // ========== CONSOLES ==========
  if ((msg.includes("ps5") || msg.includes("playstation")) && (msg.includes("réparation") || msg.includes("panne"))) {
    return `🎮 **RÉPARATION PS5**

💰 **Prix : 89-199€** (selon panne)

**Pannes fréquentes :**
- Problème alimentation : 89€
- Problème carte mère : 149-199€
- Problème lecteur disque : 79€
- Surchauffe / Ventilateur : 59€

✅ Diagnostic 40€ offert
✅ Garantie 3 mois

⏱️ Délai : 5-7 jours`;
  }

  if ((msg.includes("xbox")) && (msg.includes("réparation") || msg.includes("panne"))) {
    return `🎮 **RÉPARATION XBOX Series X/S**

💰 **Prix : 79-179€** (selon panne)

✅ Diagnostic 40€ offert
✅ Garantie 3 mois

⏱️ Délai : 5-7 jours`;
  }

  if ((msg.includes("switch") || msg.includes("nintendo")) && (msg.includes("réparation") || msg.includes("panne"))) {
    return `🎮 **RÉPARATION Nintendo Switch**

💰 **Prix : 59-129€** (selon panne)

✅ Diagnostic 40€ offert
✅ Garantie 3 mois

⏱️ Délai : 3-5 jours`;
  }

  // ========== AUTRES RÉPARATIONS ==========
  if (msg.includes("charge") || msg.includes("port") || msg.includes("connecteur")) {
    return `🔌 **RÉPARATION PORT DE CHARGE**

💰 **Prix : 45-59€** (toutes marques)

✅ Diagnostic offert selon appareil
✅ Garantie 3 mois

⏱️ Délai : 1-2 jours`;
  }

  // ========== TARIFS GÉNÉRAUX ==========
  if (msg.includes("prix") || msg.includes("tarif") || msg.includes("coût") || msg.includes("devis")) {
    return `💰 **TARIFS MBX RÉPARATIONS**

🔬 **DIAGNOSTIC :**
- 📱 Smartphone simple : 15€
- 🔧 Smartphone complexe (iPhone Pro, S23 Ultra) : 40€
- 📟 Tablette : 25€
- 🎮 Console (PS5, Xbox, Switch) : 40€

📱 **IPHONE :**
- Écran : 79-229€
- Batterie : 49-89€

📱 **SAMSUNG :**
- Écran : 89-219€
- Batterie : 49-79€

📟 **TABLETTES :**
- Écran : 89-189€
- Batterie : 59-89€

🎮 **CONSOLES :**
- PS5/Xbox : 79-199€
- Nintendo Switch : 59-129€

✅ Diagnostic déduit si réparation

📞 **Devis gratuit : 04 72 60 16 13**`;
  }

  // ========== CONTACT / HORAIRES ==========
  if (msg.includes("contact") || msg.includes("horaire") || msg.includes("adresse")) {
    return `📍 **MBX RÉPARATIONS**

**Adresse :** 8 Rue de l'Épée, 69003 Lyon

**Horaires :**
- Lundi : 10h - 18h
- Mardi : 10h - 18h
- Mercredi : 10h - 18h
- Jeudi : 10h - 18h
- Vendredi : 10h - 18h
- Samedi : Fermé
- Dimanche : Fermé

📞 **Téléphone : 04 72 60 16 13**
✉️ **Email : mbxmobilax@gmail.com**`;
  }

  // ========== GARANTIE ==========
  if (msg.includes("garantie")) {
    return `🔧 **GARANTIE MBX RÉPARATIONS**

- 🔧 Pièces : 3 mois
- 🔋 Batterie : 6 mois
- 📱 Écran : 3 mois
- 🎮 Console : 3 mois

**Satisfait ou remboursé** sous 14 jours`;
  }

  // ========== MESSAGE PAR DÉFAUT ==========
  return `🔧 **MBX ASSISTANT**

**Tarifs diagnostic :**
- 📱 Smartphone simple : 15€
- 🔧 Smartphone complexe : 40€
- 📟 Tablette : 25€
- 🎮 Console (PS5, Xbox) : 40€

**Exemples :**
- "écran iPhone 14" → 229€
- "diagnostic PS5" → 40€
- "batterie iPad" → 59-89€

📞 **04 72 60 16 13**
📍 8 Rue de l'Épée, 69003 Lyon

**Posez votre question !** 🔧`;
}

/**
 * Suggestions de pannes
 */
export async function suggestIssues(deviceType) {
  const type = deviceType?.toLowerCase() || "";
  
  if (type.includes("console") || type.includes("ps5") || type.includes("xbox")) {
    return [
      "🎮 Diagnostic console - 40€",
      "🎮 PS5 ne s'allume pas - 89€",
      "🎮 Xbox surchauffe - 59€",
      "🎮 Switch écran cassé - 89€"
    ];
  }
  
  if (type.includes("tablette") || type.includes("ipad")) {
    return [
      "📟 Diagnostic tablette - 25€",
      "📟 iPad écran cassé - 89-189€",
      "📟 Tablette batterie faible - 59-89€"
    ];
  }
  
  if (type.includes("iphone") && (type.includes("pro") || type.includes("14") || type.includes("15"))) {
    return [
      "🔧 Diagnostic iPhone Pro - 40€",
      "📱 Écran iPhone 14 - 229€",
      "🔋 Batterie iPhone 14 - 89€"
    ];
  }
  
  return [
    "📱 Diagnostic smartphone - 15€",
    "📱 Écran cassé - 79-229€",
    "🔋 Batterie - 49-89€",
    "🔌 Port charge - 45-59€"
  ];
}

/**
 * Génération de diagnostic
 */
export async function generateDiagnostic(device, issue, symptoms) {
  return `🔍 **DIAGNOSTIC TECHNIQUE**

📱 Appareil : ${device}
🛠️ Panne : ${issue}

💰 **Tarif diagnostic :**
- Smartphone simple : 15€
- Smartphone complexe (Pro/Ultra) : 40€
- Tablette : 25€
- Console : 40€

✅ Déduit si réparation
⏱️ Durée : 30-60 min

📞 **04 72 60 16 13**
📍 8 Rue de l'Épée, 69003 Lyon`;
}

/**
 * Génération de résumé
 */
export async function generateRepairSummary(device, issue, diagnosis, partsUsed) {
  return `✅ **RÉSUMÉ DES TRAVAUX**

📱 Appareil : ${device}
🛠️ Panne : ${issue}
🔍 Diagnostic : ${diagnosis || "Confirmé"}

🔧 Actions effectuées :
- Diagnostic complet
- Remplacement des pièces
- Tests de validation

🔩 Pièces : ${partsUsed || "D'origine certifiée"}
⏱️ Délai : 2-5 jours
🔧 Garantie : 3 mois (6 mois batterie)`;
}

/**
 * Génération de facture
 */
export async function generateInvoice(repairData, clientData, partsList) {
  return `🧾 **FACTURE MBX RÉPARATIONS**

N° : F-${Date.now()}
Date : ${new Date().toLocaleDateString()}

Client : ${clientData?.name || "Client"}
Appareil : ${repairData?.device || "Appareil"}

DÉTAIL :
- Diagnostic : selon appareil (15/25/40€)
- Main d'œuvre : 49€
- Pièces : À définir
- TOTAL TTC : À définir

Merci de votre confiance !`;
}