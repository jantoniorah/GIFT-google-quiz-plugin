function createForm(str, append) {
  const form = FormApp.getActiveForm();
  if (!append) {
    if (!confirmOverwrite()) {
      throw new Error("Replace was not approved by user.");
    }
  }

  // Pre-process: Extract $CATEGORY lines before parsing
  const categories = extractCategories(str);
  // Remove $CATEGORY lines from the GIFT text before parsing
  const cleanStr = str.replace(/^\$CATEGORY:.*$/gm, '').trim();

  let giftObj;
  try {
    giftObj = giftParser.parse(cleanStr);
  } catch (err) {
    if (err.location) {
      throw new Error("Line " + err.location.start.line + ", column " + err.location.start.column + ": " + err.message);
    } else {
      throw err;
    }
  }

  PropertiesService.getDocumentProperties().setProperty(form.getId(), str);
  let resultMessage = '';

  // Clear all questions in the form
  if (!append) {
    form.getItems().forEach(function(entry) {
      form.deleteItem(entry);
    });
    resultMessage = 'Replaced form with ';
  } else {
    resultMessage = 'Appended form with ';
  }

  // Insert page breaks for categories if they exist
  let categoryIndex = 0;
  for (let i = 0; i < giftObj.length; i++) {
    // Check if we need to insert a page break before this question
    while (categoryIndex < categories.length && categories[categoryIndex].beforeQuestion <= i) {
      const pageBreak = form.addPageBreakItem();
      pageBreak.setTitle(categories[categoryIndex].name);
      categoryIndex++;
    }
    addQuestion(form, giftObj[i]);
  }

  return resultMessage + giftObj.length + " question" + (giftObj.length === 1 ? '' : 's');
}

/**
 * Extracts $CATEGORY: lines from GIFT text and maps them to question positions.
 */
function extractCategories(str) {
  const lines = str.split('\n');
  const categories = [];
  let questionCount = 0;
  let lastCategory = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('$CATEGORY:')) {
      lastCategory = {
        name: trimmed.substring('$CATEGORY:'.length).trim(),
        beforeQuestion: questionCount
      };
      categories.push(lastCategory);
    } else if (trimmed === '') {
      // blank line — potential question separator
    } else if (!trimmed.startsWith('//')) {
      // Non-blank, non-comment, non-category line — likely part of a question
      // We count question boundaries by looking for lines that start new questions
      // This is a rough heuristic; the actual count comes from blank-line separation
    }
  }

  // Better approach: count questions by counting blank-line-separated blocks
  // that are not comments or categories
  const blocks = str.split(/\n\s*\n/);
  let qIndex = 0;
  const refinedCategories = [];
  
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b].trim();
    if (block.startsWith('$CATEGORY:')) {
      refinedCategories.push({
        name: block.substring('$CATEGORY:'.length).trim(),
        beforeQuestion: qIndex
      });
    } else if (block !== '' && !block.startsWith('//')) {
      qIndex++;
    }
  }

  return refinedCategories;
}

function addQuestion(form, question) {
  const giftTitle = question.title ? question.title : "";
  const stemText = stripHTML(question.stem.text);
  let item;

  switch (question.type) {
    case "Description":
      item = form.addSectionHeaderItem();
      item.setTitle(giftTitle);
      item.setHelpText(stemText);
      break;

    case "TF":
      item = form.addMultipleChoiceItem().setTitle(stemText);
      item.setPoints(1);
      item.setChoices([
        item.createChoice("True", question.isTrue),
        item.createChoice("False", !question.isTrue)
      ]);

      if (question.correctFeedback) {
        const correctFeedback = FormApp.createFeedback()
          .setText(stripHTML(question.correctFeedback.text))
          .build();
        item.setFeedbackForCorrect(correctFeedback);
      }
      if (question.incorrectFeedback) {
        const incorrectFeedback = FormApp.createFeedback()
          .setText(stripHTML(question.incorrectFeedback.text))
          .build();
        item.setFeedbackForIncorrect(incorrectFeedback);
      }
      item.setRequired(true);
      break;

    case "Essay":
      item = form.addParagraphTextItem().setTitle(stemText);
      item.setPoints(1);
      item.setRequired(true);
      break;

    case "MC":
      if (question.choices[0].weight) {
        item = form.addCheckboxItem().setTitle(stemText);
      } else {
        item = form.addMultipleChoiceItem().setTitle(stemText);
      }
      
      // Calculate point value from weights if available
      const mcPoints = calculatePoints(question.choices);
      item.setPoints(mcPoints);

      const choices = [];
      let feedbackPositive = "";
      let feedbackNegative = "";

      for (let j = 0; j < question.choices.length; j++) {
        if (question.choices[j].weight && parseInt(question.choices[j].weight) > 0) {
          question.choices[j].isCorrect = true;
        }

        const choice = item.createChoice(stripHTML(question.choices[j].text.text), !!question.choices[j].isCorrect);

        if (question.choices[j].feedback) {
          const fbMsg = "\n" + stripHTML(question.choices[j].text.text) + " (" +
            (question.choices[j].isCorrect ? "correct" : "incorrect") + "): " +
            stripHTML(question.choices[j].feedback.text);
          if (question.choices[j].isCorrect) {
            feedbackPositive += fbMsg;
          } else {
            feedbackNegative += fbMsg;
          }
        }
        choices.push(choice);
      }
      item.setChoices(choices);

      if (feedbackPositive) {
        item.setFeedbackForCorrect(FormApp.createFeedback().setText(feedbackPositive.trim()).build());
      }
      if (feedbackNegative) {
        item.setFeedbackForIncorrect(FormApp.createFeedback().setText(feedbackNegative.trim()).build());
      }
      item.setRequired(true);
      break;

    case "Matching":
      item = form.addGridItem();
      const rows = [];
      const cols = [];

      for (let j = 0; j < question.matchPairs.length; j++) {
        const pair = question.matchPairs[j];
        if (pair.subquestion.text !== "") rows.push(stripHTML(pair.subquestion.text));
        addUnique(cols, pair.subanswer);
      }

      item.setTitle(stemText).setRows(rows).setColumns(cols);
      item.setRequired(true);
      break;

    case "Short":
      item = form.addTextItem().setTitle(stemText);
      item.setPoints(1);

      // Auto-grade short answers using text validation
      if (question.choices && question.choices.length > 0) {
        try {
          const acceptedAnswers = question.choices.map(function(c) {
            return stripHTML(c.text.text);
          });
          const validation = FormApp.createTextValidation()
            .setHelpText("Accepted answers: " + acceptedAnswers.join(", "))
            .requireTextMatchesPattern("(?i)(" + acceptedAnswers.map(escapeRegex).join("|") + ")")
            .build();
          item.setValidation(validation);
        } catch (e) {
          // If validation fails, fall back to no validation
        }

        // TextItem does not support setFeedbackForCorrect; show accepted answers in help text instead
        const answerList = question.choices.map(function(c) {
          return stripHTML(c.text.text);
        }).join(", ");
        item.setHelpText("Accepted answers: " + answerList);
      }
      item.setRequired(true);
      break;

    case "Numerical":
      item = form.addTextItem().setTitle(stemText);
      item.setPoints(1);

      // TextItem does not support setFeedbackForCorrect; show feedback in help text instead
      if (question.choices) {
        if (typeof question.choices === 'object') {
          if (question.choices.feedback) {
            item.setHelpText(question.choices.feedback);
          }
        }
      }
      item.setRequired(true);
      break;

    default:
      throw new Error("Unrecognized question type: " + question.type);
  }
}

/**
 * Calculate point value from GIFT weight percentages.
 * Sums positive weights; if none found, returns 1.
 */
function calculatePoints(choices) {
  let maxPositiveWeight = 0;
  let hasWeights = false;

  for (let i = 0; i < choices.length; i++) {
    if (choices[i].weight) {
      hasWeights = true;
      const w = parseInt(choices[i].weight);
      if (w > 0) {
        maxPositiveWeight += w;
      }
    }
  }

  if (!hasWeights || maxPositiveWeight === 0) return 1;
  // Normalize: 100% total weight = 1 point. Scale accordingly.
  return Math.max(1, Math.round(maxPositiveWeight / 100));
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addUnique(set, item) {
  if (!set.includes(item)) {
    set.push(item);
  }
}

function stripHTML(str) {
  return str ? str.replace(/<(?:.|\n)*?>/gm, '') : '';
}

function confirmOverwrite() {
  const ui = FormApp.getUi();
  const result = ui.alert(
    'Replace Questions',
    'Are you sure you want to replace all the questions in the current form?',
    ui.ButtonSet.YES_NO);
  return (result === ui.Button.YES);
}