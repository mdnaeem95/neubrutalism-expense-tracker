import { Redirect } from 'expo-router';

// Individual category editing redirects to category management for now
export default function CategoryDetail() {
  return <Redirect href="/category" />;
}
