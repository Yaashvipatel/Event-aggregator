const mongoose = require("mongoose");

const FormFieldSchema = new mongoose.Schema(
  {
    fieldName: { type: String, required: true }, 
    label:     { type: String, required: true }, 
    type:      { type: String, default: "text", enum: ["text", "email", "number", "tel"] },
    required:  { type: Boolean, default: false },
  },
  { _id: false }
);

const RegistrationSchema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    formData:  { type: Map, of: String }, 
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    image: {
      type: String, 
      default: null,
    },


    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    
    requiresRegistration: {
      type: Boolean,
      default: false,
    },
    formFields: [FormFieldSchema], 

   
    registrations: [RegistrationSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Event", EventSchema);