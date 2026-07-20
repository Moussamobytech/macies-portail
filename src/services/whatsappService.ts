/**
 * Service pour l'envoi de messages WhatsApp.
 * TODO: Remplacer par l'API réelle (ex: Twilio, GreenAPI, UltraMsg) une fois le compte créé.
 */
export const sendWhatsAppMessage = async (phone: string, message: string): Promise<boolean> => {
  try {
    console.log(`\n========================================`);
    console.log(`[WHATSAPP MOCK] Envoi au numéro : ${phone}`);
    console.log(`[MESSAGE] : ${message}`);
    console.log(`========================================\n`);
    
    // Simule un appel réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  } catch (error) {
    console.error("Erreur WhatsApp:", error);
    return false;
  }
};
