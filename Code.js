/**
 * GIFT Quiz Editor Plus — Google Forms Add-on
 * Converts GIFT-formatted text into Google Forms quiz questions.
 */

const ADDON_TITLE = 'GIFT Quiz Editor';

const defaultGiftSourceText = [
  '// Welcome to GIFT Quiz Editor!',
  '// Below are sample questions showcasing different types.',
  '// Edit them or replace with your own GIFT-formatted questions.',
  '',
  '::True or False:: The sun rises in the east. {TRUE}',
  '',
  '::Multiple Choice:: What color is the sky on a clear day? {',
  '  =Blue # Correct!',
  '  ~Green # Not quite.',
  '  ~Red # Not quite.',
  '}',
  '',
  '::Short Answer:: What is the capital of France? {=Paris =paris}',
  '',
  '::Essay:: Describe the water cycle in your own words. {}',
  ''
].join('\n');

/**
 * Adds a custom menu to the active form to show the add-on sidebar.
 */
function onOpen(e) {
  FormApp.getUi()
    .createAddonMenu()
    .addItem('Open editor', 'showSidebar')
    .addItem('About', 'showAbout')
    .addToUi();
}

/**
 * Runs when the add-on is installed.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Opens the sidebar with the GIFT editor.
 */
function showSidebar() {
  FormApp.getActiveForm().setIsQuiz(true);
  let giftSourceText = PropertiesService.getDocumentProperties().getProperty(FormApp.getActiveForm().getId());
  if (!giftSourceText) {
    giftSourceText = defaultGiftSourceText;
  }
  const html = HtmlService.createTemplateFromFile('Sidebar');
  html.giftSourceText = giftSourceText;
  const htmlOutput = html.evaluate().setTitle(ADDON_TITLE);
  FormApp.getUi().showSidebar(htmlOutput);
}

/**
 * Shows the About dialog.
 */
function showAbout() {
  const ui = HtmlService.createHtmlOutputFromFile('About')
    .setWidth(420)
    .setHeight(340);
  FormApp.getUi().showModalDialog(ui, 'About GIFT Quiz Editor');
}