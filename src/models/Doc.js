import mongoose from 'mongoose';
const DocSchema = new mongoose.Schema({
  filename: String,
  text: String,
  chunks: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.models.Doc || mongoose.model('Doc', DocSchema);
