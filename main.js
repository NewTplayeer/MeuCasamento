import AppModel from './Model/AppModel.js';
import AppView from './View/AppView.js';
import AppController from './Controller/AppController.js';

// Inicialização
const appModel = new AppModel();
const appView = new AppView();
const appController = new AppController(appModel, appView);

// Inicia a aplicação
appController.init();

// EXPOR PARA O WINDOW (Crucial para os botões do HTML funcionarem)
window.appController = appController;