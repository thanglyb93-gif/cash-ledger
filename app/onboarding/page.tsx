import { createOrgAction } from "./actions";

export default function OnboardingPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Add your business</h1>
        <p className="mt-1 text-sm text-zinc-500">
          You can add more businesses later from the org switcher.
        </p>

        <form action={createOrgAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
              Business name
            </label>
            <input
              id="name"
              name="name"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base shadow-sm focus:border-zinc-500 focus:outline-none"
              placeholder="e.g. Hoang Long Coffee"
            />
          </div>

          <div>
            <label htmlFor="base_currency" className="block text-sm font-medium text-zinc-700">
              Base currency
            </label>
            <select
              id="base_currency"
              name="base_currency"
              defaultValue="VND"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base shadow-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Create business
          </button>
        </form>
      </div>
    </div>
  );
}
